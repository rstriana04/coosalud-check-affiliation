import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Progress } from './ui/Progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/Table';
import {
  Calendar, FileText, Loader2, Upload, CheckCircle2,
  XCircle, Download, Mail, HeartPulse, ClipboardList
} from 'lucide-react';
import * as api from '@/services/api';

export default function RCBMonthly() {
  return (
    <Tabs defaultValue="rcv" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="rcv">
          <HeartPulse className="w-4 h-4 mr-2" />
          Informe RCV
        </TabsTrigger>
        <TabsTrigger value="monthly">
          <ClipboardList className="w-4 h-4 mr-2" />
          Reporte Mensual
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rcv">
        <RCVReportTab />
      </TabsContent>

      <TabsContent value="monthly">
        <MonthlyReportTab />
      </TabsContent>
    </Tabs>
  );
}

function RCVReportTab() {
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [useEmail, setUseEmail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
    if (selected) {
      setFile(selected);
      setResult(null);
    }
  }, []);

  const pollJobStatus = useCallback((id) => {
    pollingRef.current = setInterval(async () => {
      try {
        const status = await api.getRCVJobStatus(id);
        setJobStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsProcessing(false);

          if (status.status === 'completed') {
            toast.success('Informe generado y enviado por email', { id: 'rcv-report' });
            setResult({ success: true, summary: status.summary, jobId: id });
          } else {
            toast.error('Error en el procesamiento', {
              id: 'rcv-report',
              description: status.error
            });
          }
        }
      } catch {
        // keep polling
      }
    }, 5000);
  }, []);

  const handleGenerate = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setJobStatus(null);

    toast.loading('Procesando informe RCV...', {
      id: 'rcv-report',
      description: 'Este proceso puede tomar varios minutos'
    });

    try {
      const emailToSend = useEmail && email ? email : undefined;
      const response = await api.generateRCVReport(file, emailToSend);

      if (response.jobId) {
        setJobId(response.jobId);
        setJobStatus({ status: 'processing' });
        toast.loading('Procesando en segundo plano...', {
          id: 'rcv-report',
          description: 'Se enviara el resultado por email'
        });
        pollJobStatus(response.jobId);
      } else {
        setIsProcessing(false);
        setResult(response);
        toast.success('Informe RCV generado', {
          id: 'rcv-report',
          description: `${response.summary?.successful || 0} de ${response.summary?.total || 0} pacientes procesados`
        });
      }
    } catch (error) {
      setIsProcessing(false);
      toast.error('Error generando informe', {
        id: 'rcv-report',
        description: error.response?.data?.message || error.message
      });
    }
  };

  const handleDownload = () => {
    if (jobId) {
      window.open(api.getRCVDownloadUrl(jobId), '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-red-500" />
            Generar Informe de Riesgo Cardiovascular
          </CardTitle>
          <CardDescription>
            Sube un archivo Excel con los pacientes a procesar. Columnas requeridas:
            identipac, fecha_atencion, nombremedico. Opcional: programa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={handleFileDrop}
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
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div className="text-left">
                  <p className="font-medium text-green-700">{file.name}</p>
                  <p className="text-sm text-green-600">
                    {(file.size / 1024).toFixed(1)} KB — Clic para cambiar
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
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generar Informe RCV
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isProcessing && jobStatus?.status === 'processing' && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="font-medium">Procesando en segundo plano...</span>
            </div>
            <Progress value={30} className="mb-2" />
            <p className="text-sm text-gray-500">
              El resultado se enviara a {email} cuando finalice.
            </p>
          </CardContent>
        </Card>
      )}

      {result && <RCVResults result={result} onDownload={handleDownload} hasJobId={!!jobId} />}
    </div>
  );
}

function RCVResults({ result, onDownload, hasJobId }) {
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
            <div className="rounded-md border">
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
                        {r.error || '—'}
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

function SummaryCard({ label, value, color }) {
  return (
    <div className="rounded-lg border bg-gray-50 p-4 text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MonthlyReportTab() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      toast.loading('Generando informe...', {
        id: 'rcb-report',
        description: 'Este proceso puede tomar varios minutos'
      });

      const response = await api.generateRCBMonthlyReport(startDate, endDate);

      toast.success('Informe generado exitosamente', {
        id: 'rcb-report',
        description: 'El archivo ha sido descargado'
      });

      console.log('Report generated:', response);
    } catch (error) {
      toast.error('Error al generar informe', {
        id: 'rcb-report',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Reporte Mensual por Rango de Fechas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha hasta
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerateReport}
              disabled={!startDate || !endDate || isGenerating}
              className="px-6"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generar informe
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados del Informe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tipo Doc</TableHead>
                  <TableHead>Numero Documento</TableHead>
                  <TableHead>Fecha Afiliacion</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length > 0 ? (
                  reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.tipoDocumento}</TableCell>
                      <TableCell>{row.numeroDocumento}</TableCell>
                      <TableCell>{row.fechaAfiliacion}</TableCell>
                      <TableCell>{row.estado}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="text-gray-500">
                        No hay datos para mostrar. Selecciona un rango de fechas y genera el informe.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
