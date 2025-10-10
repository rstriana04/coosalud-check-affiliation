import { Redis } from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const redis = new Redis(config.redis.url);

const HISTORY_KEY = 'job:history';
const JOB_KEY_PREFIX = 'job:data:';
const MAX_HISTORY_SIZE = 100;

export class JobHistoryService {
  static async saveJob(jobData) {
    try {
      const jobId = jobData.jobId;
      const historyEntry = {
        jobId,
        filename: jobData.filename,
        totalRecords: jobData.totalRecords,
        processed: jobData.processed,
        success: jobData.success,
        failed: jobData.failed,
        startTime: jobData.startTime,
        endTime: new Date().toISOString(),
        status: jobData.status || 'completed'
      };

      await redis.set(
        `${JOB_KEY_PREFIX}${jobId}`,
        JSON.stringify(jobData),
        'EX',
        config.redis.jobHistoryTTL
      );

      await redis.lpush(HISTORY_KEY, JSON.stringify(historyEntry));
      await redis.ltrim(HISTORY_KEY, 0, MAX_HISTORY_SIZE - 1);

      logger.info('Job saved to history', { jobId });
      return historyEntry;
    } catch (error) {
      logger.error('Failed to save job to history', { error: error.message });
      throw error;
    }
  }

  static async getHistory(limit = 20) {
    try {
      const historyJson = await redis.lrange(HISTORY_KEY, 0, limit - 1);
      return historyJson.map(json => JSON.parse(json));
    } catch (error) {
      logger.error('Failed to get job history', { error: error.message });
      return [];
    }
  }

  static async getJobData(jobId) {
    try {
      const data = await redis.get(`${JOB_KEY_PREFIX}${jobId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get job data', { jobId, error: error.message });
      return null;
    }
  }

  static async deleteJob(jobId) {
    try {
      await redis.del(`${JOB_KEY_PREFIX}${jobId}`);
      
      const historyJson = await redis.lrange(HISTORY_KEY, 0, -1);
      const filteredHistory = historyJson.filter(json => {
        const entry = JSON.parse(json);
        return entry.jobId !== jobId;
      });

      await redis.del(HISTORY_KEY);
      if (filteredHistory.length > 0) {
        await redis.rpush(HISTORY_KEY, ...filteredHistory);
      }

      logger.info('Job deleted from history', { jobId });
      return true;
    } catch (error) {
      logger.error('Failed to delete job', { jobId, error: error.message });
      return false;
    }
  }
}

