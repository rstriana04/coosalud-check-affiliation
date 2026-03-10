import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync } from 'fs';
import { ProgressService } from '../services/progressService.js';
import { ExcelHandler } from '../utils/excelHandler.js';
import { addBatchScraperJobs, pauseQueue, resumeQueue, obliterateQueue, cancelJobsByPrefix } from '../services/queueService.js';
import { CleanupService } from '../services/cleanupService.js';
import { JobHistoryService } from '../services/jobHistoryService.js';
import { logger } from '../utils/logger.js';
import { NotFoundError, AppError } from '../middleware/errorHandler.js';
import { validate, jobIdSchema, startJobSchema } from '../middleware/validator.js';
import { emitLog, emitJobPaused, emitJobCancelled } from '../services/socketService.js';
import { RetryService } from '../services/retryService.js';
import { JobStatus, RecordStatus } from '../../../shared/types.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../uploads');
const PROCESSED_DIR = join(__dirname, '../../processed');

router.get('/:id', validate(jobIdSchema), async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    const progressService = new ProgressService(jobId);
    const progress = await progressService.load();

    if (!progress) {
      throw new NotFoundError('Job not found');
    }

    const progressData = progressService.getProgress();
    const stats = progressService.getStats();

    res.json({
      success: true,
      job: {
        jobId,
        status: progressService.isComplete() ? JobStatus.COMPLETED : JobStatus.PROCESSING,
        ...progressData,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/start', validate(startJobSchema), async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    const progressService = new ProgressService(jobId);
    const progress = await progressService.load();

    if (!progress) {
      throw new NotFoundError('Job not found');
    }

    const files = readdirSync(UPLOADS_DIR).filter(f => f.startsWith(jobId));
    
    if (files.length === 0) {
      throw new NotFoundError('Source file not found');
    }

    const sourceFile = join(UPLOADS_DIR, files[0]);
    
    if (!existsSync(sourceFile)) {
      throw new NotFoundError('Source file not found');
    }

    const excelHandler = new ExcelHandler(sourceFile);
    const records = excelHandler.getRecords().length > 0 
      ? excelHandler.getRecords() 
      : await excelHandler.read();

    await addBatchScraperJobs(jobId, records);

    logger.info('Processing started', { jobId, totalRecords: records.length });

    emitLog('info', `Processing started: ${records.length} records`, {});

    res.json({
      success: true,
      message: 'Processing started',
      jobId,
      totalRecords: records.length
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/pause', validate(jobIdSchema), async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    await pauseQueue();

    logger.info('Processing paused', { jobId });
    
    emitJobPaused(jobId);
    emitLog('warning', 'Processing paused', {});

    res.json({
      success: true,
      message: 'Processing paused'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/resume', validate(jobIdSchema), async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    await resumeQueue();

    logger.info('Processing resumed', { jobId });
    
    emitLog('info', 'Processing resumed', {});

    res.json({
      success: true,
      message: 'Processing resumed'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancel', validate(jobIdSchema), async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    await cancelJobsByPrefix(jobId);
    await obliterateQueue();

    const progressService = new ProgressService(jobId);
    await progressService.delete();
    logger.debug('Progress data deleted from Redis', { jobId });

    const retryService = new RetryService(jobId);
    await retryService.clearFailedRecords();
    logger.debug('Failed records cleared from Redis', { jobId });

    logger.info('Processing cancelled and data cleaned', { jobId });
    
    emitJobCancelled(jobId);
    emitLog('error', 'Processing cancelled', {});

    res.json({
      success: true,
      message: 'Processing cancelled and cleaned'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/download', validate(jobIdSchema), async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    const progressService = new ProgressService(jobId);
    const progress = await progressService.load();

    if (!progress) {
      throw new NotFoundError('Job not found');
    }

    const files = readdirSync(UPLOADS_DIR).filter(f => f.startsWith(jobId));
    
    if (files.length === 0) {
      throw new NotFoundError('Source file not found');
    }

    const sourceFile = join(UPLOADS_DIR, files[0]);
    
    if (!existsSync(sourceFile)) {
      throw new NotFoundError('Source file not found');
    }

    const excelHandler = new ExcelHandler(sourceFile);
    await excelHandler.read();

    const records = progressService.getAllRecords();
    
    records.forEach(record => {
      if (record.status === RecordStatus.SUCCESS && record.fechaAfiliacion) {
        excelHandler.updateRecord(record.rowIndex, record.fechaAfiliacion);
      }
    });

    const outputFilename = `processed-${jobId}.xlsx`;
    const outputPath = join(PROCESSED_DIR, outputFilename);
    
    await excelHandler.save(outputPath);

    const progressData = progressService.getProgress();
    await JobHistoryService.saveJob({
      jobId,
      filename: files[0],
      totalRecords: progressData.total,
      processed: progressData.processed,
      success: progressData.success,
      failed: progressData.failed,
      startTime: progressData.startTime,
      status: progressData.processed >= progressData.total ? 'completed' : 'partial'
    });

    logger.info('File download requested', { jobId, outputPath });

    res.download(outputPath, `coosalud-afiliacion-${Date.now()}.xlsx`, async (err) => {
      if (err) {
        logger.error('Error downloading file', { error: err.message });
        next(err);
      } else {
        await CleanupService.cleanupJob(jobId);
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/records', validate(jobIdSchema), async (req, res, next) => {
  try {
    const { id: jobId } = req.params;

    const progressService = new ProgressService(jobId);
    const progress = await progressService.load();

    if (!progress) {
      throw new NotFoundError('Job not found');
    }

    const records = progressService.getAllRecords();

    res.json({
      success: true,
      records
    });
  } catch (error) {
    next(error);
  }
});

export default router;

