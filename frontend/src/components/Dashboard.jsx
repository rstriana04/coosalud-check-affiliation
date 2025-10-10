import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Activity, Download, Play, Pause, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import FileUpload from './FileUpload';
import StatsCards from './StatsCards';
import ProgressBar from './ProgressBar';
import RecordsTable from './RecordsTable';
import LogsViewer from './LogsViewer';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useProgress } from '@/hooks/useProgress';
import * as api from '@/services/api';

export default function Dashboard() {
  const [jobId, setJobId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filename, setFilename] = useState('');

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
  }, [updateProgress, updateRecord, addLog]);

  const { isConnected } = useWebSocket(handleWebSocketEvent);

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
      await api.startJob(jobId);
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
        await api.resumeJob(jobId);
        setIsPaused(false);
        toast.info('Procesamiento reanudado');
      } else {
        await api.pauseJob(jobId);
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
      await api.cancelJob(jobId);
      setIsProcessing(false);
      toast.warning('Procesamiento cancelado');
    } catch (error) {
      toast.error(`Error al cancelar: ${error.message}`);
    }
  };

  const handleDownload = () => {
    if (!jobId) return;
    
    api.downloadJob(jobId);
    toast.success('Descargando archivo procesado...');
  };

  const isComplete = progress.processed >= progress.total && progress.total > 0;
  const hasResults = progress.processed > 0 && progress.total > 0;

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
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {!jobId ? (
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="records" className="w-full">
                <TabsList>
                  <TabsTrigger value="records">
                    Registros ({records.length})
                  </TabsTrigger>
                  <TabsTrigger value="logs">
                    Logs ({logs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="records">
                  <RecordsTable records={records} />
                </TabsContent>

                <TabsContent value="logs">
                  <LogsViewer logs={logs} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

