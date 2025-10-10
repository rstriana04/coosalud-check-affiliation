import React, { useState, useEffect } from 'react';
import { Download, Trash2, History, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import * as api from '@/services/api';

export default function JobHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.getJobHistory();
      setHistory(response.data);
    } catch (error) {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownload = (jobId) => {
    window.open(api.downloadResults(jobId), '_blank');
    toast.success('Descargando archivo...');
  };

  const handleDelete = async (jobId) => {
    if (!confirm('¿Estás seguro de eliminar este trabajo?')) return;

    try {
      await api.deleteJob(jobId);
      toast.success('Trabajo eliminado');
      fetchHistory();
    } catch (error) {
      toast.error('Error al eliminar trabajo');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const formatDuration = (start, end) => {
    const duration = new Date(end) - new Date(start);
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de trabajos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Cargando historial...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de trabajos
          </CardTitle>
          <CardDescription>
            Trabajos completados y resultados descargables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No hay trabajos en el historial
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de trabajos
            </CardTitle>
            <CardDescription>
              {history.length} trabajo{history.length !== 1 ? 's' : ''} disponible{history.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((job) => (
            <div
              key={job.jobId}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-sm">{job.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(job.startTime)} • 
                      Duración: {formatDuration(job.startTime, job.endTime)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-600">
                    ✓ {job.success} exitosos
                  </span>
                  {job.failed > 0 && (
                    <span className="text-red-600">
                      ✗ {job.failed} fallidos
                    </span>
                  )}
                  <span className="text-gray-500">
                    Total: {job.totalRecords}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(job.jobId)}
                  title="Descargar resultados"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(job.jobId)}
                  className="text-red-600 hover:text-red-700"
                  title="Eliminar trabajo"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

