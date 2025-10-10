export const JobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

export const RecordStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  SKIPPED: 'skipped'
};

export const LogLevel = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

export const SocketEvents = {
  JOB_STARTED: 'job:started',
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
  JOB_PAUSED: 'job:paused',
  JOB_CANCELLED: 'job:cancelled',
  LOGS_NEW: 'logs:new',
  PROCESSING_START: 'processing:start',
  PROCESSING_PAUSE: 'processing:pause',
  PROCESSING_CANCEL: 'processing:cancel'
};

export const ExcelColumns = {
  TIPO_ID: 6,
  NUMERO_ID: 7,
  FECHA_AFILIACION: 16
};

