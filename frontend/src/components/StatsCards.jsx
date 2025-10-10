import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { FileText, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { formatNumber, formatDuration } from '@/lib/utils';

export default function StatsCards({ progress }) {
  const stats = [
    {
      title: 'Total Registros',
      value: formatNumber(progress.total),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Procesados',
      value: formatNumber(progress.processed),
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      title: 'Exitosos',
      value: formatNumber(progress.success),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Fallidos',
      value: formatNumber(progress.failed),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Omitidos',
      value: formatNumber(progress.skipped),
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Tiempo Promedio',
      value: formatDuration(progress.avgTimePerRecord),
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-full`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

