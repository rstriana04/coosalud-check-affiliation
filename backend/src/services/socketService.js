import { SocketEvents } from '../../../shared/types.js';
import { logger } from '../utils/logger.js';

let io = null;

export const initializeSocketService = (socketIoInstance) => {
  io = socketIoInstance;
  logger.info('Socket service initialized');
};

export const emitJobStarted = (jobId, record) => {
  if (!io) return;
  
  io.emit(SocketEvents.JOB_STARTED, {
    jobId,
    record,
    timestamp: new Date().toISOString()
  });
};

export const emitJobProgress = (jobId, progress) => {
  if (!io) {
    logger.warn('Socket.io not initialized, cannot emit progress');
    return;
  }
  
  const payload = {
    jobId,
    ...progress,
    timestamp: new Date().toISOString()
  };
  
  logger.debug('Emitting job:progress', payload);
  io.emit(SocketEvents.JOB_PROGRESS, payload);
};

export const emitJobCompleted = (jobId, result) => {
  if (!io) return;
  
  io.emit(SocketEvents.JOB_COMPLETED, {
    jobId,
    result,
    timestamp: new Date().toISOString()
  });
};

export const emitJobFailed = (jobId, error) => {
  if (!io) return;
  
  io.emit(SocketEvents.JOB_FAILED, {
    jobId,
    error: error.message || error,
    timestamp: new Date().toISOString()
  });
};

export const emitJobPaused = (jobId) => {
  if (!io) return;
  
  io.emit(SocketEvents.JOB_PAUSED, {
    jobId,
    timestamp: new Date().toISOString()
  });
};

export const emitJobCancelled = (jobId) => {
  if (!io) return;
  
  io.emit(SocketEvents.JOB_CANCELLED, {
    jobId,
    timestamp: new Date().toISOString()
  });
};

export const emitLog = (level, message, data = {}) => {
  if (!io) {
    logger.warn('Socket.io not initialized, cannot emit log');
    return;
  }
  
  const payload = {
    level,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  io.emit(SocketEvents.LOGS_NEW, payload);
};

export const getIoInstance = () => io;

