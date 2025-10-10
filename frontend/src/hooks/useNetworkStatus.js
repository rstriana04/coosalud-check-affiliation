import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useNetworkStatus = (onOffline, onOnline) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión restaurada', {
        description: 'Se puede continuar con el procesamiento'
      });
      if (onOnline) onOnline();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Sin conexión a internet', {
        description: 'El proceso se pausará automáticamente',
        duration: 5000
      });
      if (onOffline) onOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      const currentStatus = navigator.onLine;
      if (currentStatus !== isOnline) {
        setIsOnline(currentStatus);
        if (currentStatus) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, onOffline, onOnline]);

  return isOnline;
};

