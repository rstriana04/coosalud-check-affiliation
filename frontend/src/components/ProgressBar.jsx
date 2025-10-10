import React from 'react';
import { Card, CardContent } from './ui/Card';
import { Progress } from './ui/Progress';
import { formatDuration } from '@/lib/utils';

export default function ProgressBar({ progress }) {
  const percentage = progress.percentage || 0;
  const remainingTime = formatDuration(progress.estimatedRemainingMs);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium">
              Progreso: {progress.processed} / {progress.total}
            </div>
            <div className="text-sm text-muted-foreground">
              {percentage}%
            </div>
          </div>
          
          <Progress value={percentage} className="h-3" />
          
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>
              {progress.total - progress.processed} registros restantes
            </span>
            {progress.estimatedRemainingMs > 0 && (
              <span>
                Tiempo estimado: {remainingTime}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

