import { useState, useCallback } from 'react';

export const useProgress = () => {
  const [progress, setProgress] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    percentage: 0,
    avgTimePerRecord: 0,
    estimatedRemainingMs: 0
  });

  const [records, setRecords] = useState([]);
  const [logs, setLogs] = useState([]);

  const updateProgress = useCallback((data) => {
    console.log('[useProgress] Updating progress with:', data);
    setProgress((prev) => {
      const newProgress = {
        ...prev,
        ...data
      };
      console.log('[useProgress] New progress state:', newProgress);
      return newProgress;
    });
  }, []);

  const updateRecord = useCallback((recordData) => {
    setRecords((prev) => {
      const existing = prev.find(r => r.index === recordData.index);
      
      if (existing) {
        return prev.map(r => 
          r.index === recordData.index 
            ? { ...r, ...recordData }
            : r
        );
      }
      
      return [...prev, recordData];
    });
  }, []);

  const setAllRecords = useCallback((newRecords) => {
    setRecords(newRecords);
  }, []);

  const addLog = useCallback((log) => {
    setLogs((prev) => {
      const newLogs = [log, ...prev];
      return newLogs.slice(0, 500);
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const reset = useCallback(() => {
    setProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      percentage: 0,
      avgTimePerRecord: 0,
      estimatedRemainingMs: 0
    });
    setRecords([]);
    setLogs([]);
  }, []);

  return {
    progress,
    records,
    logs,
    updateProgress,
    updateRecord,
    setAllRecords,
    addLog,
    clearLogs,
    reset
  };
};

