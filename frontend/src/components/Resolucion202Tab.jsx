import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/Table';
import {
  FileText, Loader2, Upload, CheckCircle2, XCircle, Download,
  Mail, ClipboardCheck, AlertTriangle, FileSpreadsheet, Calendar
} from 'lucide-react';
import ProgressBar from './ProgressBar';
import LogsViewer from './LogsViewer';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useProgress } from '@/hooks/useProgress';
import { db } from '@/services/db';
import * as api from '@/services/api';

const REGIMEN_OPTIONS = [
  { value: 'S', label: 'S - Subsidiado' },
  { value: 'C', label: 'C - Contributivo' },
  { value: 'P', label: 'P - Particular' },
  { value: 'E', label: 'E - Especial' },
  { value: 'O', label: 'O - Otro' },
  { value: 'N', label: 'N - No asegurado' }
];

export default function Resolucion202Tab() {
  return (
    <Tabs defaultValue="generate" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="generate">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Generar Informe
        </TabsTrigger>
        <TabsTrigger value="validate">
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Validar Archivo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="generate">
        <GenerateReportSection />
      </TabsContent>

      <TabsContent value="validate">
        <ValidateFileSection />
      </TabsContent>
    </Tabs>
  );
}

const RES202_JOB_KEY = 'current_res202_job';

function GenerateReportSection() {
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [filename, setFilename] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [codigoHabilitacion, setCodigoHabilitacion] = useState('761471222301');
  const [codigoEntidad, setCodigoEntidad] = useState('761471');
  const [regimen, setRegimen] = useState('S');
  const fileInputRef = useRef(null);
  const hasRestoredRef = useRef(false);

  const { progress, logs, updateProgress, addLog, reset } = useProgress();

  const handleWebSocketEvent = useCallback((event, data) => {
    const eventJobId = data?.jobId || data?.data?.jobId;
    if (!eventJobId || !eventJobId.startsWith('res202-')) return;

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
    toast.success('Informe Resolucion 202 generado', {
      description: `${status.summary?.successful || 0} de ${status.summary?.total || 0} registros`
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
      const saved = await db.getJob(RES202_JOB_KEY);
      if (!saved || !saved.jobId) return;

      setJobId(saved.jobId);
      setFilename(saved.filename || '');
      setIsProcessing(saved.isProcessing || false);
      if (saved.progress) updateProgress(saved.progress);
      if (saved.result) setResult(saved.result);

      if (saved.isProcessing) {
        try {
          const status = await api.getResolucion202JobStatus(saved.jobId);
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
            await db.deleteJob(RES202_JOB_KEY);
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
      }, RES202_JOB_KEY);
    };
    saveState();
  }, [jobId, progress, isProcessing, filename, result]);

  useEffect(() => {
    if (!isProcessing || !jobId) return;

    const checkInterval = setInterval(async () => {
      try {
        const status = await api.getResolucion202JobStatus(jobId);
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
          db.deleteJob(RES202_JOB_KEY);
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
    if (!file || !periodoInicio || !periodoFin) return;

    reset();
    setIsProcessing(true);
    setResult(null);
    setFilename(file.name);

    try {
      const response = await api.generateResolucion202Report(file, {
        periodoInicio,
        periodoFin,
        codigoHabilitacion,
        codigoEntidad,
        regimen,
        email: useEmail && email ? email : undefined
      });

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
      window.open(api.getResolucion202DownloadUrl(downloadJobId), '_blank');
    }
  };

  const handleNewProcess = async () => {
    reset();
    setFile(null);
    setJobId(null);
    setResult(null);
    setIsProcessing(false);
    setFilename('');
    await db.deleteJob(RES202_JOB_KEY);
  };

  const canGenerate = file && periodoInicio && periodoFin && !isProcessing && !(useEmail && !email);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Generar Informe Resolucion 202/2021
            {isConnected && (
              <Badge variant="outline" className="ml-auto text-xs font-normal text-green-600 border-green-300">
                Conectado
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Sube un archivo Excel consolidado con los 119 campos de la resolucion o genera desde la base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isProcessing && !result && (
            <>
              <PeriodConfiguration
                periodoInicio={periodoInicio}
                periodoFin={periodoFin}
                codigoHabilitacion={codigoHabilitacion}
                codigoEntidad={codigoEntidad}
                regimen={regimen}
                onPeriodoInicioChange={setPeriodoInicio}
                onPeriodoFinChange={setPeriodoFin}
                onCodigoHabilitacionChange={setCodigoHabilitacion}
                onCodigoEntidadChange={setCodigoEntidad}
                onRegimenChange={setRegimen}
              />

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
                disabled={!canGenerate}
                className="w-full sm:w-auto px-8"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generar Informe 202
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
        <GenerateResults
          result={result}
          onDownload={handleDownload}
          hasJobId={!!(result?.jobId || jobId)}
        />
      )}

      {(isProcessing || logs.length > 0) && <LogsViewer logs={logs} />}
    </div>
  );
}

function ValidateFileSection() {
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const fileInputRef = useRef(null);

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped && isExcelFile(dropped)) {
      setFile(dropped);
      setValidationResult(null);
    } else {
      toast.error('Solo se permiten archivos .xlsx o .xls');
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setValidationResult(null); }
  }, []);

  const handleValidate = async () => {
    if (!file || !periodoInicio || !periodoFin) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await api.validateResolucion202(file, periodoInicio, periodoFin);
      setValidationResult(response);

      if (response.totalErrors === 0) {
        toast.success('Archivo valido', {
          description: `${response.totalRecords} registros sin errores`
        });
      } else {
        toast.warning('Validacion completada con errores', {
          description: `${response.totalErrors} errores en ${response.totalRecords} registros`
        });
      }
    } catch (error) {
      toast.error('Error validando archivo', {
        description: error.response?.data?.message || error.message
      });
    } finally {
      setIsValidating(false);
    }
  };

  const toggleRow = (rowNum) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowNum)) {
        next.delete(rowNum);
      } else {
        next.add(rowNum);
      }
      return next;
    });
  };

  const handleNewValidation = () => {
    setFile(null);
    setValidationResult(null);
    setExpandedRows(new Set());
  };

  const canValidate = file && periodoInicio && periodoFin && !isValidating;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            Validar Archivo Resolucion 202
          </CardTitle>
          <CardDescription>
            Sube un archivo Excel con formato 202 para validar su contenido contra las reglas de la resolucion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!validationResult && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Periodo Inicio
                  </label>
                  <input
                    type="date"
                    value={periodoInicio}
                    onChange={(e) => setPeriodoInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Periodo Fin
                  </label>
                  <input
                    type="date"
                    value={periodoFin}
                    onChange={(e) => setPeriodoFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              <FileDropzone
                file={file}
                fileInputRef={fileInputRef}
                onDrop={handleFileDrop}
                onSelect={handleFileSelect}
              />

              <Button
                onClick={handleValidate}
                disabled={!canValidate}
                className="w-full sm:w-auto px-8"
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                )}
                {isValidating ? 'Validando...' : 'Validar Archivo'}
              </Button>
            </>
          )}

          {validationResult && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Archivo: <span className="font-medium">{file?.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleNewValidation}>
                Nueva validacion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {validationResult && (
        <ValidationResults
          result={validationResult}
          expandedRows={expandedRows}
          onToggleRow={toggleRow}
        />
      )}
    </div>
  );
}

function PeriodConfiguration({
  periodoInicio, periodoFin, codigoHabilitacion,
  codigoEntidad, regimen, onPeriodoInicioChange,
  onPeriodoFinChange, onCodigoHabilitacionChange,
  onCodigoEntidadChange, onRegimenChange
}) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Periodo Inicio
          </label>
          <input
            type="date"
            value={periodoInicio}
            onChange={(e) => onPeriodoInicioChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Periodo Fin
          </label>
          <input
            type="date"
            value={periodoFin}
            onChange={(e) => onPeriodoFinChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Codigo Habilitacion IPS
          </label>
          <input
            type="text"
            value={codigoHabilitacion}
            onChange={(e) => onCodigoHabilitacionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Codigo Entidad
          </label>
          <input
            type="text"
            value={codigoEntidad}
            onChange={(e) => onCodigoEntidadChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Regimen
          </label>
          <select
            value={regimen}
            onChange={(e) => onRegimenChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
          >
            {REGIMEN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function ValidationResults({ result, expandedRows, onToggleRow }) {
  const hasErrors = result.totalErrors > 0;
  const flatErrors = flattenRecordErrors(result.recordErrors || []);
  const errorsByField = buildErrorsByField(flatErrors);

  if (!hasErrors) {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Archivo valido</p>
              <p className="text-sm text-green-600">
                {result.totalRecords} registros, 0 errores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recordErrors = result.recordErrors || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <ValidationSummaryCard
          label="Total Registros"
          value={result.totalRecords || 0}
          color="text-gray-900"
          icon={<FileText className="w-5 h-5 text-gray-400" />}
        />
        <ValidationSummaryCard
          label="Errores"
          value={result.totalErrors || 0}
          color="text-red-600"
          icon={<XCircle className="w-5 h-5 text-red-400" />}
        />
        <ValidationSummaryCard
          label="Advertencias"
          value={result.totalWarnings || 0}
          color="text-amber-600"
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {errorsByField.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Errores por Campo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errorsByField.map(({ field, count, percentage }) => (
                <div key={field} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-48 truncate" title={field}>
                    {field}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-red-400 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de Errores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Fila</TableHead>
                  <TableHead>Campo</TableHead>
                  <TableHead className="w-24">Codigo</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Valor Actual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordErrors.map(({ row, errors: rowErrors }) => (
                  <React.Fragment key={row}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onToggleRow(row)}
                    >
                      <TableCell className="font-mono font-medium">{row}</TableCell>
                      <TableCell colSpan={4}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {rowErrors.length} {rowErrors.length === 1 ? 'error' : 'errores'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {expandedRows.has(row) ? 'Ocultar' : 'Ver detalle'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(row) && rowErrors.map((err, idx) => (
                      <TableRow key={`${row}-${idx}`} className="bg-red-50/50">
                        <TableCell />
                        <TableCell className="text-sm">{err.fieldLabel}</TableCell>
                        <TableCell>
                          <Badge variant={err.type === 'error' ? 'destructive' : 'outline'}>
                            {err.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{err.description}</TableCell>
                        <TableCell className="text-sm font-mono text-gray-500 max-w-xs truncate">
                          {err.value || '\u2014'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GenerateResults({ result, onDownload, hasJobId }) {
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

function ValidationSummaryCard({ label, value, color, icon }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function flattenRecordErrors(recordErrors) {
  const flat = [];
  for (const { row, errors } of recordErrors) {
    for (const err of errors) {
      flat.push({ ...err, row });
    }
  }
  return flat;
}

function buildErrorsByField(errors) {
  const fieldCounts = {};
  for (const err of errors) {
    const key = err.fieldLabel || err.fieldName || String(err.field);
    fieldCounts[key] = (fieldCounts[key] || 0) + 1;
  }

  const entries = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const maxCount = entries.length > 0 ? entries[0][1] : 1;

  return entries.map(([field, count]) => ({
    field,
    count,
    percentage: Math.max((count / maxCount) * 100, 5)
  }));
}

function isExcelFile(file) {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  return validTypes.includes(file.type) || /\.xlsx?$/i.test(file.name);
}
