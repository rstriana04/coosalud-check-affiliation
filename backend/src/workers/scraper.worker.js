import { Worker } from 'bullmq';
import { connection, isJobCancelled } from '../services/queueService.js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { CoosaludScraper } from '../utils/scraper.js';
import { ProgressService } from '../services/progressService.js';
import { RetryService } from '../services/retryService.js';
import { ExcelHandler } from '../utils/excelHandler.js';
import { publishEvent, initializeEventBus } from '../services/eventBus.js';
import { RecordStatus, SocketEvents } from '../../../shared/types.js';
import { unlink } from 'fs/promises';

initializeEventBus();

const scrapers = new Map();

const getScraper = async (workerId) => {
  if (!scrapers.has(workerId)) {
    const scraper = new CoosaludScraper();
    await scraper.initialize();
    scrapers.set(workerId, scraper);
  }
  return scrapers.get(workerId);
};

const worker = new Worker(
  'adres-scraper',
  async (job) => {
    const { jobId, index, tipoDocumento, numeroDocumento } = job.data;
    
    if (await isJobCancelled(job.id)) {
      logger.info('Job cancelled, skipping record', { jobId: job.id, index });
      throw new Error('Job cancelled by user');
    }
    
    logger.info('Processing record', { 
      jobId: job.id, 
      index, 
      tipoDocumento, 
      numeroDocumento 
    });

    const progressService = new ProgressService(jobId);
    await progressService.load();

    await progressService.updateRecord(index, RecordStatus.PROCESSING);
    
    const progressBefore = progressService.getProgress();
    
    publishEvent(SocketEvents.JOB_PROGRESS, {
      jobId,
      ...progressBefore
    });
    
    logger.info(`Progress: ${progressBefore.processed}/${progressBefore.total} (${progressBefore.percentage}%)`, {
      jobId,
      processed: progressBefore.processed,
      total: progressBefore.total,
      percentage: progressBefore.percentage
    });

    publishEvent(SocketEvents.LOGS_NEW, {
      level: 'info',
      message: `Processing record ${index + 1} of ${progressBefore.total}`,
      data: {
        tipoDocumento,
        numeroDocumento,
        progress: `${progressBefore.processed}/${progressBefore.total}`
      }
    });

    let pdfPath = null;
    
    try {
      if (await isJobCancelled(job.id)) {
        logger.info('Job cancelled before scraping', { jobId: job.id, index });
        throw new Error('Job cancelled by user');
      }
      
      const scraper = await getScraper(worker.id);
      
      const result = await scraper.queryAffiliationDate(
        tipoDocumento,
        numeroDocumento
      );
      
      if (await isJobCancelled(job.id)) {
        logger.info('Job cancelled after scraping', { jobId: job.id, index });
        if (result.pdfPath) {
          try {
            await unlink(result.pdfPath);
          } catch (err) {}
        }
        throw new Error('Job cancelled by user');
      }

      const { fechaAfiliacion, pdfPath: downloadedPdfPath } = result;
      pdfPath = downloadedPdfPath;

      await progressService.updateRecord(index, RecordStatus.SUCCESS, {
        fechaAfiliacion
      });

      publishEvent(SocketEvents.JOB_COMPLETED, {
        jobId: job.id,
        result: {
          index,
          tipoDocumento,
          numeroDocumento,
          fechaAfiliacion
        }
      });

      const progress = progressService.getProgress();
      
      logger.info(`Progress: ${progress.processed}/${progress.total} (${progress.percentage}%)`, {
        jobId,
        processed: progress.processed,
        total: progress.total,
        percentage: progress.percentage,
        status: 'success'
      });

      publishEvent(SocketEvents.LOGS_NEW, {
        level: 'success',
        message: `Record ${index + 1} of ${progress.total} completed`,
        data: {
          fechaAfiliacion,
          progress: `${progress.processed}/${progress.total}`
        }
      });

      publishEvent(SocketEvents.JOB_PROGRESS, {
        jobId,
        ...progress
      });

      if (pdfPath) {
        try {
          await unlink(pdfPath);
          logger.debug('PDF file deleted', { pdfPath });
        } catch (unlinkError) {
          logger.warn('Could not delete PDF file', { 
            pdfPath, 
            error: unlinkError.message 
          });
        }
      }

      await scraper.randomDelay();

      return { 
        success: true, 
        fechaAfiliacion,
        index
      };
    } catch (error) {
      logger.error('Error processing record', {
        jobId: job.id,
        index,
        error: error.message
      });

      await progressService.updateRecord(index, RecordStatus.FAILED, {
        error: error.message
      });
      
      if (job.attemptsMade >= config.processing.maxRetries) {
        const retryService = new RetryService(jobId);
        await retryService.addFailedRecord({
          index,
          tipoDocumento,
          numeroDocumento,
          error: error.message
        });
        
        logger.info('Record added to retry list after max attempts', {
          jobId,
          index,
          attempts: job.attemptsMade
        });
      }

      publishEvent(SocketEvents.JOB_FAILED, {
        jobId: job.id,
        error: error.message
      });

      publishEvent(SocketEvents.LOGS_NEW, {
        level: 'error',
        message: `Record ${index + 1} failed`,
        data: {
          error: error.message
        }
      });

      const progress = progressService.getProgress();
      publishEvent(SocketEvents.JOB_PROGRESS, {
        jobId,
        ...progress
      });

      if (pdfPath) {
        try {
          await unlink(pdfPath);
          logger.debug('PDF file deleted after error', { pdfPath });
        } catch (unlinkError) {
          logger.warn('Could not delete PDF file after error', { 
            pdfPath, 
            error: unlinkError.message 
          });
        }
      }

      throw error;
    }
  },
    {
      connection,
      concurrency: 1,
      limiter: {
        max: 1,
        duration: config.scraping.minDelayMs
      }
    }
);

worker.on('completed', (job) => {
  logger.info('Job completed', { 
    jobId: job.id,
    result: job.returnvalue 
  });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', { 
    jobId: job?.id,
    error: err.message,
    attempts: job?.attemptsMade 
  });
});

worker.on('error', (error) => {
  logger.error('Worker error', { error: error.message });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  
  for (const scraper of scrapers.values()) {
    await scraper.close();
  }
  
  await worker.close();
  process.exit(0);
});

logger.info('Worker started', { 
  concurrency: config.processing.maxWorkers 
});

export default worker;

