import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null
});

connection.on('error', (error) => {
  logger.error('Redis connection error', { error: error.message });
});

connection.on('connect', () => {
  logger.info('Redis connected successfully');
});

export const scraperQueue = new Queue('adres-scraper', {
  connection,
  defaultJobOptions: {
    attempts: config.processing.maxRetries,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600
    }
  }
});

export const addScraperJob = async (jobId, data) => {
  try {
    const job = await scraperQueue.add('scrape-record', data, {
      jobId: `${jobId}-${data.index}`
    });

    logger.debug('Job added to queue', { 
      jobId: job.id, 
      recordIndex: data.index 
    });

    return job;
  } catch (error) {
    logger.error('Error adding job to queue', { 
      jobId, 
      error: error.message 
    });
    throw error;
  }
};

export const addBatchScraperJobs = async (jobId, records) => {
  try {
    const jobs = records.map((record, index) => ({
      name: 'scrape-record',
      data: {
        jobId,
        index,
        tipoDocumento: record.tipoDocumento,
        numeroDocumento: record.numeroDocumento
      },
      opts: {
        jobId: `${jobId}-${index}`
      }
    }));

    const addedJobs = await scraperQueue.addBulk(jobs);
    
    logger.info('Batch jobs added to queue', { 
      jobId, 
      count: addedJobs.length 
    });

    return addedJobs;
  } catch (error) {
    logger.error('Error adding batch jobs', { 
      jobId, 
      error: error.message 
    });
    throw error;
  }
};

export const pauseQueue = async () => {
  try {
    await scraperQueue.pause();
    logger.info('Queue paused');
  } catch (error) {
    logger.error('Error pausing queue', { error: error.message });
    throw error;
  }
};

export const resumeQueue = async () => {
  try {
    await scraperQueue.resume();
    logger.info('Queue resumed');
  } catch (error) {
    logger.error('Error resuming queue', { error: error.message });
    throw error;
  }
};

export const cancelJobsByPrefix = async (jobIdPrefix) => {
  try {
    await connection.set(`cancel:${jobIdPrefix}`, '1', 'EX', 300);
    logger.info('Cancellation flag set', { jobIdPrefix });
  } catch (error) {
    logger.error('Error setting cancellation flag', { error: error.message });
    throw error;
  }
};

export const isJobCancelled = async (jobId) => {
  try {
    const parts = jobId.split('-');
    if (parts.length < 2) return false;
    
    const jobIdPrefix = parts.slice(0, -1).join('-');
    const cancelled = await connection.get(`cancel:${jobIdPrefix}`);
    return cancelled === '1';
  } catch (error) {
    logger.error('Error checking cancellation flag', { error: error.message });
    return false;
  }
};

export const obliterateQueue = async () => {
  try {
    await scraperQueue.pause();
    
    const activeJobs = await scraperQueue.getActive();
    for (const job of activeJobs) {
      try {
        await job.moveToFailed({ message: 'Job cancelled by user' }, true);
      } catch (err) {
        logger.warn('Failed to cancel active job', { jobId: job.id });
      }
    }
    
    await scraperQueue.obliterate({ force: true });
    logger.info('Queue obliterated');
  } catch (error) {
    logger.error('Error obliterating queue', { error: error.message });
    throw error;
  }
};

export const getQueueStatus = async () => {
  try {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      scraperQueue.getWaitingCount(),
      scraperQueue.getActiveCount(),
      scraperQueue.getCompletedCount(),
      scraperQueue.getFailedCount(),
      scraperQueue.getDelayedCount(),
      scraperQueue.isPaused()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused
    };
  } catch (error) {
    logger.error('Error getting queue status', { error: error.message });
    throw error;
  }
};

export const getJobById = async (jobId) => {
  try {
    const job = await scraperQueue.getJob(jobId);
    return job;
  } catch (error) {
    logger.error('Error getting job', { jobId, error: error.message });
    return null;
  }
};

export const removeJob = async (jobId) => {
  try {
    const job = await getJobById(jobId);
    if (job) {
      await job.remove();
      logger.info('Job removed', { jobId });
    }
  } catch (error) {
    logger.error('Error removing job', { jobId, error: error.message });
  }
};

export { connection };

