import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Trash2, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function LogsViewer({ logs }) {
  const [filter, setFilter] = useState('all');
  const logsEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(false);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  const getLevelColor = (level) => {
    const colors = {
      info: 'bg-blue-50 text-blue-700 border-blue-200',
      success: 'bg-green-50 text-green-700 border-green-200',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      error: 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[level] || colors.info;
  };

  const getLevelBadge = (level) => {
    const variants = {
      info: 'default',
      success: 'default',
      warning: 'outline',
      error: 'destructive'
    };
    return variants[level] || 'default';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logs en Tiempo Real</CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={filter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={filter === 'info' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('info')}
              >
                Info
              </Button>
              <Button
                variant={filter === 'success' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('success')}
              >
                Éxito
              </Button>
              <Button
                variant={filter === 'warning' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('warning')}
              >
                Alerta
              </Button>
              <Button
                variant={filter === 'error' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('error')}
              >
                Error
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? '⏸' : '▶'} Auto-scroll
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No hay logs para mostrar
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getLevelBadge(log.level)} className="text-xs">
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs opacity-60">
                          {new Date(log.timestamp).toLocaleTimeString('es-CO')}
                        </span>
                      </div>
                      <div className="font-medium">{log.message}</div>
                      {log.data && Object.keys(log.data).length > 0 && (
                        <div className="mt-1 text-xs opacity-75">
                          {JSON.stringify(log.data, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{filteredLogs.length} logs mostrados</span>
          <span>Scroll automático: {autoScroll ? 'Activado' : 'Desactivado'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

