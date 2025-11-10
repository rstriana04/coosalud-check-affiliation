import React, { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Activity, Download, Play, Pause, X, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import FileUpload from './FileUpload';
import StatsCards from './StatsCards';
import ProgressBar from './ProgressBar';
import RecordsTable from './RecordsTable';
import LogsViewer from './LogsViewer';
import JobHistory from './JobHistory';
import RCBMonthly from './RCBMonthly';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useProgress } from '@/hooks/useProgress';
import { useJobPersistence } from '@/hooks/useJobPersistence';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import * as api from '@/services/api';

export default function Dashboard() {
  const [activeView, setActiveView] = useState('automation');
  const [jobId, setJobId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filename, setFilename] = useState('');
  const hasRestoredRef = useRef(false);

  const {
    progress,
    records,
    logs,
    updateProgress,
    updateRecord,
    setAllRecords,
    addLog,
    reset
  } = useProgress();

  const handleWebSocketEvent = useCallback((event, data) => {
    console.log('[Dashboard] WebSocket Event:', event, data);
    
    if (data && data.jobId && !jobId) {
      console.log('[Dashboard] 🔄 Restoring jobId from WebSocket:', data.jobId);
      setJobId(data.jobId);
      setIsProcessing(true);
      
      if (data.filename) {
        setFilename(data.filename);
      }
      
      toast.info('Reconectado a proceso en curso', {
        description: 'Continuando desde donde quedó',
        duration: 3000
      });
    }
    
    switch (event) {
      case 'job:progress':
        console.log('[Dashboard] Updating progress:', data);
        updateProgress(data);
        break;
      
      case 'job:completed':
        updateRecord({
          index: data.result.index,
          tipoDocumento: data.result.tipoDocumento,
          numeroDocumento: data.result.numeroDocumento,
          fechaAfiliacion: data.result.fechaAfiliacion,
          status: 'success'
        });
        break;
      
      case 'job:failed':
        addLog({
          level: 'error',
          message: `Error: ${data.error}`,
          timestamp: data.timestamp
        });
        break;
      
      case 'logs:new':
        addLog(data);
        break;
      
      case 'job:paused':
        setIsPaused(true);
        toast.info('Procesamiento pausado');
        break;
      
      case 'job:cancelled':
        setIsProcessing(false);
        toast.error('Procesamiento cancelado');
        break;
    }
  }, [updateProgress, updateRecord, addLog, jobId]);

  const { isConnected } = useWebSocket(handleWebSocketEvent);
  
  const { restoreJob, clearJob } = useJobPersistence(jobId, progress, isProcessing, isPaused, filename, records);

  const handlePause = useCallback(async () => {
    if (!jobId) return;
    try {
      await api.pauseProcessing(jobId);
      setIsPaused(true);
    } catch (error) {
      console.error('Error pausing:', error);
    }
  }, [jobId]);

  const handleResume = useCallback(async () => {
    if (!jobId) return;
    try {
      await api.resumeProcessing(jobId);
      setIsPaused(false);
    } catch (error) {
      console.error('Error resuming:', error);
    }
  }, [jobId]);

  const handleNetworkOffline = useCallback(async () => {
    if (isProcessing && !isPaused && jobId) {
      console.log('[Dashboard] Internet lost, pausing process...');
      setIsPaused(true);
      try {
        await api.pauseProcessing(jobId);
      } catch (error) {
        console.error('[Dashboard] Failed to notify server of pause:', error);
      }
    }
  }, [isProcessing, isPaused, jobId]);

  const handleNetworkOnline = useCallback(async () => {
    if (isPaused && jobId && isProcessing) {
      console.log('[Dashboard] Internet restored, resuming process...');
      setIsPaused(false);
      try {
        await api.resumeProcessing(jobId);
      } catch (error) {
        console.error('[Dashboard] Failed to resume process:', error);
        setIsPaused(true);
      }
    }
  }, [isPaused, jobId, isProcessing]);

  const isOnline = useNetworkStatus(handleNetworkOffline, handleNetworkOnline);

  useEffect(() => {
    const restoreSession = async () => {
      if (hasRestoredRef.current) {
        console.log('[Dashboard] Already restored, skipping...');
        return;
      }
      
      console.log('[Dashboard] Component mounted, attempting to restore session...');
      
      try {
        const restoredJob = await restoreJob();
        
        if (restoredJob) {
          console.log('[Dashboard] Session found:', restoredJob);
          
          setJobId(restoredJob.jobId);
          setFilename(restoredJob.filename || '');
          setIsProcessing(restoredJob.isProcessing);
          setIsPaused(restoredJob.isPaused || false);
          
          updateProgress(restoredJob.progress || {
            total: 0,
            processed: 0,
            success: 0,
            failed: 0,
            skipped: 0,
            percentage: 0
          });
          
      if (restoredJob.records && restoredJob.records.length > 0) {
        console.log(`[Dashboard] Restoring ${restoredJob.records.length} records`);
        setAllRecords(restoredJob.records);
      }
          
          hasRestoredRef.current = true;
          
          toast.info('Sesión restaurada', {
            description: `Trabajo: ${restoredJob.progress.processed}/${restoredJob.progress.total} registros`,
            duration: 5000
          });
        } else {
          console.log('[Dashboard] No previous session found');
          hasRestoredRef.current = true;
        }
      } catch (error) {
        console.error('[Dashboard] Error restoring session:', error);
        hasRestoredRef.current = true;
      }
    };

    restoreSession();
  }, [restoreJob, updateProgress, updateRecord]);

  const handleFileSelect = async (file) => {
    try {
      setIsUploading(true);
      
      const response = await api.uploadFile(file);
      
      setJobId(response.jobId);
      setFilename(response.filename);
      
      updateProgress({
        total: response.totalRecords,
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        percentage: 0
      });

      toast.success(`Archivo cargado: ${response.totalRecords} registros`);
    } catch (error) {
      toast.error(`Error al cargar archivo: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartProcessing = async () => {
    if (!jobId) return;

    try {
      await api.startProcessing(jobId);
      setIsProcessing(true);
      setIsPaused(false);
      toast.success('Procesamiento iniciado');
    } catch (error) {
      toast.error(`Error al iniciar: ${error.message}`);
    }
  };

  const handlePauseProcessing = async () => {
    if (!jobId) return;

    try {
      if (isPaused) {
        await api.resumeProcessing(jobId);
        setIsPaused(false);
        toast.info('Procesamiento reanudado');
      } else {
        await api.pauseProcessing(jobId);
        setIsPaused(true);
        toast.info('Procesamiento pausado');
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleCancelProcessing = async () => {
    if (!jobId) return;

    try {
      toast.loading('Cancelando proceso...', {
        id: 'cancel-toast',
        description: 'Los trabajos activos terminarán en unos segundos'
      });
      
      await api.cancelProcessing(jobId);
      setIsProcessing(false);
      setIsPaused(false);
      await clearJob();
      
      toast.warning('Procesamiento cancelado', {
        id: 'cancel-toast',
        description: 'Se detuvo el proceso correctamente'
      });
    } catch (error) {
      toast.error(`Error al cancelar: ${error.message}`, {
        id: 'cancel-toast'
      });
    }
  };

  const isComplete = progress.processed >= progress.total && progress.total > 0;
  const hasResults = progress.processed > 0 && progress.total > 0;

  const handleDownload = async () => {
    if (!jobId) return;
    
    window.open(api.downloadResults(jobId), '_blank');
    toast.success('Descargando archivo procesado...');
  };

  const handleNewProcess = async () => {
    if (!jobId) return;
    
    try {
      await clearJob();
      setJobId(null);
      setFilename('');
      setIsProcessing(false);
      setIsPaused(false);
      reset();
      
      toast.success('Listo para nuevo proceso', {
        description: 'Sube un nuevo archivo para comenzar'
      });
    } catch (error) {
      console.error('[Dashboard] Error starting new process:', error);
      toast.error('Error al iniciar nuevo proceso');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ADRES Automation
                </h1>
                <p className="text-sm text-gray-500">
                  Sistema de consulta automática de fechas de afiliación
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Internet</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-600 font-medium">Sin internet</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-600">
                  {isConnected ? 'WebSocket' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button
              variant={activeView === 'automation' ? 'default' : 'outline'}
              onClick={() => setActiveView('automation')}
            >
              Automatización
            </Button>
            <Button
              variant={activeView === 'rcb-monthly' ? 'default' : 'outline'}
              onClick={() => setActiveView('rcb-monthly')}
            >
              RCB Mensual
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {activeView === 'rcb-monthly' ? (
            <RCBMonthly />
          ) : !jobId ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Cargar Archivo Excel</CardTitle>
                  <CardDescription>
                    Sube tu archivo Excel con los datos de identificación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload 
                    onFileSelect={handleFileSelect}
                    isUploading={isUploading}
                  />
                </CardContent>
              </Card>

              <div className="mt-8">
                <JobHistory />
              </div>
            </>
          ) : (
            <>
              <StatsCards progress={progress} />
              
              <ProgressBar progress={progress} />

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Archivo actual</p>
                      <p className="font-medium">{filename}</p>
                    </div>

                    <div className="flex gap-2">
                      {!isProcessing ? (
                        <Button 
                          onClick={handleStartProcessing}
                          disabled={isComplete}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar Procesamiento
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline"
                            onClick={handlePauseProcessing}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            {isPaused ? 'Reanudar' : 'Pausar'}
                          </Button>
                          
                          <Button 
                            variant="destructive"
                            onClick={handleCancelProcessing}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                          </Button>
                        </>
                      )}

                      <Button
                        variant="secondary"
                        onClick={handleDownload}
                        disabled={!hasResults}
                        title={hasResults ? 'Descargar resultados actuales' : 'No hay resultados disponibles'}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {isComplete ? 'Descargar Resultados' : 'Descargar Parciales'}
                      </Button>

                      {isComplete && (
                        <Button
                          variant="default"
                          onClick={handleNewProcess}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar Nuevo Proceso
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isComplete && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-green-900">¡Proceso Completado!</h3>
                        <p className="text-sm text-green-700">
                          Se procesaron {progress.success} registros exitosamente de {progress.total} totales.
                          {progress.failed > 0 && ` ${progress.failed} registro(s) fallaron.`}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue="records" className="w-full">
                <TabsList>
                  <TabsTrigger value="records">
                    Registros ({records.length})
                  </TabsTrigger>
                  <TabsTrigger value="logs">
                    Logs ({logs.length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    Historial
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="records">
                  <RecordsTable records={records} />
                </TabsContent>

                <TabsContent value="logs">
                  <LogsViewer logs={logs} />
                </TabsContent>

                <TabsContent value="history">
                  <JobHistory />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

