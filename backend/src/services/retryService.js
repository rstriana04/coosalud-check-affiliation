import { Redis } from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const redis = new Redis(config.redis.url);

const RETRY_KEY_PREFIX = 'retry:';

export class RetryService {
  constructor(jobId) {
    this.jobId = jobId;
    this.key = `${RETRY_KEY_PREFIX}${jobId}`;
  }

  async addFailedRecord(record) {
    try {
      await redis.rpush(this.key, JSON.stringify(record));
      logger.debug('Failed record added to retry list', { jobId: this.jobId, record });
    } catch (error) {
      logger.error('Failed to add record to retry list', { error: error.message });
    }
  }

  async getFailedRecords() {
    try {
      const records = await redis.lrange(this.key, 0, -1);
      return records.map(r => JSON.parse(r));
    } catch (error) {
      logger.error('Failed to get retry records', { error: error.message });
      return [];
    }
  }

  async clearFailedRecords() {
    try {
      await redis.del(this.key);
      logger.debug('Retry list cleared', { jobId: this.jobId });
    } catch (error) {
      logger.error('Failed to clear retry list', { error: error.message });
    }
  }

  async getFailedCount() {
    try {
      return await redis.llen(this.key);
    } catch (error) {
      logger.error('Failed to get retry count', { error: error.message });
      return 0;
    }
  }
}

