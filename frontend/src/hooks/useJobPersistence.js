import { useEffect } from 'react';
import { db } from '../services/db';

export const useJobPersistence = (jobId, progress, isProcessing, isPaused, filename, records) => {
  useEffect(() => {
    const saveToIndexedDB = async () => {
      console.log('[useJobPersistence] Effect triggered with:', { 
        jobId, 
        hasProgress: !!progress,
        isProcessing, 
        isPaused, 
        filename,
        recordsCount: records?.length || 0
      });
      
      if (jobId && progress && progress.total > 0) {
        const jobData = {
          jobId,
          progress,
          isProcessing,
          isPaused,
          filename: filename || '',
          records: Array.isArray(records) ? records : []
        };
        
        try {
          console.log('[useJobPersistence] Saving to IndexedDB:', jobData);
          await db.saveJob(jobData);
        } catch (error) {
          console.error('[useJobPersistence] Error saving to IndexedDB:', error);
        }
      } else if (!jobId) {
        console.log('[useJobPersistence] No jobId, removing from IndexedDB');
        try {
          await db.deleteJob();
        } catch (error) {
          console.error('[useJobPersistence] Error deleting from IndexedDB:', error);
        }
      } else {
        console.log('[useJobPersistence] Conditions not met for saving:', {
          hasJobId: !!jobId,
          hasProgress: !!progress,
          hasTotal: progress?.total > 0
        });
      }
    };

    saveToIndexedDB();
  }, [jobId, progress, isProcessing, isPaused, filename, records]);

  const restoreJob = async () => {
    try {
      console.log('[useJobPersistence] Attempting to restore from IndexedDB...');
      
      await db.migrateFromLocalStorage();
      
      const jobData = await db.getJob();
      
      if (jobData) {
        console.log('[useJobPersistence] Successfully restored job data from IndexedDB');
        return jobData;
      } else {
        console.log('[useJobPersistence] No stored data found in IndexedDB');
        return null;
      }
    } catch (error) {
      console.error('[useJobPersistence] Error restoring job from IndexedDB', error);
      return null;
    }
  };

  const clearJob = async () => {
    try {
      console.log('[useJobPersistence] Clearing job from IndexedDB');
      await db.deleteJob();
    } catch (error) {
      console.error('[useJobPersistence] Error clearing job:', error);
    }
  };

  return { restoreJob, clearJob };
};

