import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/Table';
import {
  FileText, Loader2, Upload, CheckCircle2,
  XCircle, Download, Mail, Microscope
} from 'lucide-react';
import ProgressBar from './ProgressBar';
import LogsViewer from './LogsViewer';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useProgress } from '@/hooks/useProgress';
import { db } from '@/services/db';
import * as api from '@/services/api';

const CITOLOGIAS_JOB_KEY = 'current_citologias_job';

export default function CitologiasReportTab() {
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [filename, setFilename] = useState('');
  const fileInputRef = useRef(null);
  const hasRestoredRef = useRef(false);

  const { progress, logs, updateProgress, addLog, reset } = useProgress();

  const handleWebSocketEvent = useCallback((event, data) => {
    const eventJobId = data?.jobId || data?.data?.jobId;
    if (!eventJobId || !eventJobId.startsWith('citologias-')) return;

    switch (event) {
      case 'job:progress':
        updateProgress(data);
        break;
      case 'logs:new':
        addLog(data);
        break;
    }
  }, [updateProgress, addLog]);

  const { isConnected } = useWebSocket(handleWebSocketEvent);

  const handleJobCompleted = useCallback(async (completedJobId, status) => {
    setIsProcessing(false);
    setResult({
      success: true,
      summary: status.summary,
      results: status.results || [],
      jobId: completedJobId
    });
    updateProgress({
      percentage: 100,
      processed: status.summary?.total || 0
    });
    toast.success('Informe citologias generado', {
      description: `${status.summary?.successful || 0} de ${status.summary?.total || 0} pacientes`
    });
  }, [updateProgress]);

  const handleJobFailed = useCallback((errorMsg) => {
    setIsProcessing(false);
    toast.error('Error en el procesamiento', { description: errorMsg });
  }, []);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restore = async () => {
      const saved = await db.getJob(CITOLOGIAS_JOB_KEY);
      if (!saved || !saved.jobId) return;

      setJobId(saved.jobId);
      setFilename(saved.filename || '');
      setIsProcessing(saved.isProcessing || false);
      if (saved.progress) updateProgress(saved.progress);
      if (saved.result) setResult(saved.result);

      if (saved.isProcessing) {
        try {
          const status = await api.getCitologiasJobStatus(saved.jobId);
          if (status.status === 'completed') {
            handleJobCompleted(saved.jobId, status);
          } else if (status.status === 'failed') {
            handleJobFailed(status.error);
          } else {
            toast.info('Sesion restaurada', {
              description: `Procesamiento de ${saved.filename} en curso`
            });
          }
        } catch (err) {
          if (err.response?.status === 404) {
            setIsProcessing(false);
            setJobId(null);
            setResult(null);
            reset();
            await db.deleteJob(CITOLOGIAS_JOB_KEY);
            toast.warning('El proceso anterior se perdio', {
              description: 'El servidor se reinicio. Puedes iniciar un nuevo proceso.'
            });
          }
        }
      }
    };

    restore();
  }, []);

  useEffect(() => {
    if (!jobId || !progress.total) return;
    const saveState = async () => {
      await db.saveJob({
        jobId, filename, isProcessing, progress, result
      }, CITOLOGIAS_JOB_KEY);
    };
    saveState();
  }, [jobId, progress, isProcessing, filename, result]);

  useEffect(() => {
    if (!isProcessing || !jobId) return;

    const checkInterval = setInterval(async () => {
      try {
        const status = await api.getCitologiasJobStatus(jobId);
        if (status.status === 'completed') {
          clearInterval(checkInterval);
          handleJobCompleted(jobId, status);
        } else if (status.status === 'failed') {
          clearInterval(checkInterval);
          handleJobFailed(status.error);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          clearInterval(checkInterval);
          setIsProcessing(false);
          setJobId(null);
          setResult(null);
          reset();
          db.deleteJob(CITOLOGIAS_JOB_KEY);
          toast.warning('El proceso se perdio', {
            description: 'El servidor se reinicio. Puedes iniciar un nuevo proceso.'
          });
        }
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [isProcessing, jobId, handleJobCompleted, handleJobFailed]);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped && isExcelFile(dropped)) {
      setFile(dropped);
      setResult(null);
    } else {
      toast.error('Solo se permiten archivos .xlsx o .xls');
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setResult(null); }
  }, []);

  const handleGenerate = async () => {
    if (!file) return;
    reset();
    setIsProcessing(true);
    setResult(null);
    setFilename(file.name);

    try {
      const emailToSend = useEmail && email ? email : undefined;
      const response = await api.generateCitologiasReport(file, emailToSend);
      if (response.jobId) {
        setJobId(response.jobId);
        toast.info('Procesamiento iniciado', {
          description: 'Puedes ver el progreso en tiempo real'
        });
      }
    } catch (error) {
      setIsProcessing(false);
      toast.error('Error iniciando procesamiento', {
        description: error.response?.data?.message || error.message
      });
    }
  };

  const handleDownload = () => {
    const downloadJobId = result?.jobId || jobId;
    if (downloadJobId) {
      window.open(api.getCitologiasDownloadUrl(downloadJobId), '_blank');
    }
  };

  const handleNewProcess = async () => {
    reset();
    setFile(null);
    setJobId(null);
    setResult(null);
    setIsProcessing(false);
    setFilename('');
    await db.deleteJob(CITOLOGIAS_JOB_KEY);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-purple-500" />
            Generar Informe Citologias
            {isConnected && (
              <Badge variant="outline" className="ml-auto text-xs font-normal text-green-600 border-green-300">
                Conectado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Sube un archivo Excel con los pacientes a procesar. Columnas requeridas:
            identipac, fecha_atencion, nombremedico. La columna programa debe tener:
            citologias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isProcessing && !result && (
            <>
              <FileDropzone
                file={file}
                fileInputRef={fileInputRef}
                onDrop={handleFileDrop}
                onSelect={handleFileSelect}
              />

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useEmail}
                    onChange={(e) => setUseEmail(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Enviar resultado por email</span>
                </label>
              </div>

              {useEmail && (
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              )}

              <Button
                onClick={handleGenerate}
                disabled={!file || isProcessing || (useEmail && !email)}
                className="w-full sm:w-auto px-8"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generar Informe Citologias
              </Button>
            </>
          )}

          {(isProcessing || result) && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Archivo: <span className="font-medium">{filename || file?.name}</span>
              </div>
              {!isProcessing && result && (
                <Button variant="outline" size="sm" onClick={handleNewProcess}>
                  Nuevo proceso
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isProcessing && progress.total > 0 && <ProgressBar progress={progress} />}

      {isProcessing && progress.total === 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="font-medium">Iniciando procesamiento...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <CitologiasResults
          result={result}
          onDownload={handleDownload}
          hasJobId={!!(result?.jobId || jobId)}
        />
      )}

      {(isProcessing || logs.length > 0) && <LogsViewer logs={logs} />}
    </div>
  );
}

function CitologiasResults({ result, onDownload, hasJobId }) {
  if (!result) return null;
  const { summary, results } = result;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resultado del Procesamiento</span>
            {hasJobId && (
              <Button size="sm" onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Descargar ZIP
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total" value={summary?.total || 0} color="text-gray-900" />
            <SummaryCard label="Exitosos" value={summary?.successful || 0} color="text-green-600" />
            <SummaryCard label="Fallidos" value={summary?.failed || 0} color="text-red-600" />
          </div>

          {results && results.length > 0 && (
            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Identificacion</TableHead>
                    <TableHead>Fecha Atencion</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono">{r.identipac}</TableCell>
                      <TableCell>{r.fecha}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'success' ? 'default' : 'destructive'}>
                          {r.status === 'success' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Exitoso</>
                          ) : (
                            <><XCircle className="w-3 h-3 mr-1" /> Fallido</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                        {r.error || '\u2014'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FileDropzone({ file, fileInputRef, onDrop, onSelect }) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={onSelect}
        className="hidden"
      />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <div className="text-left">
            <p className="font-medium text-green-700">{file.name}</p>
            <p className="text-sm text-green-600">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
      ) : (
        <div>
          <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="font-medium text-gray-700">Arrastra tu archivo Excel aqui</p>
          <p className="text-sm text-gray-500 mt-1">o haz clic para seleccionar</p>
          <p className="text-xs text-gray-400 mt-2">Formatos: .xlsx, .xls</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-4 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function isExcelFile(file) {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  return validTypes.includes(file.type) || /\.xlsx?$/i.test(file.name);
}
