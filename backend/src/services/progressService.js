import { Redis } from 'ioredis';
import { RecordStatus } from '../../../shared/types.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null
});

connection.on('error', (err) => {
  logger.error('Redis connection error in ProgressService', { error: err.message });
});

export class ProgressService {
  constructor(jobId) {
    this.jobId = jobId;
    this.redisKey = `job:${jobId}:progress`;
    this.progress = {
      jobId,
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      records: []
    };
  }

  async initialize(records) {
    this.progress.total = records.length;
    this.progress.records = records.map((record, index) => ({
      index,
      rowIndex: record.rowIndex,
      tipoDocumento: record.tipoDocumento,
      numeroDocumento: record.numeroDocumento,
      status: RecordStatus.PENDING,
      fechaAfiliacion: null,
      error: null,
      attempts: 0
    }));

    await this.save();
    logger.info('Progress initialized in Redis', { jobId: this.jobId, total: records.length });
  }

  async updateRecord(index, status, data = {}) {
    await this.load();
    
    if (index < 0 || index >= this.progress.records.length) {
      logger.warn('Invalid record index', { index });
      return;
    }

    const record = this.progress.records[index];
    const oldStatus = record.status;

    record.status = status;
    record.attempts = (record.attempts || 0) + 1;
    
    if (data.fechaAfiliacion) {
      record.fechaAfiliacion = data.fechaAfiliacion;
    }
    
    if (data.error) {
      record.error = data.error;
    }

    if (oldStatus === RecordStatus.PENDING || oldStatus === RecordStatus.PROCESSING) {
      if (status === RecordStatus.SUCCESS) {
        this.progress.success++;
        this.progress.processed++;
      } else if (status === RecordStatus.FAILED) {
        this.progress.failed++;
        this.progress.processed++;
      } else if (status === RecordStatus.SKIPPED) {
        this.progress.skipped++;
        this.progress.processed++;
      }
    }

    this.progress.lastUpdate = new Date().toISOString();
    await this.save();
  }

  getProgress() {
    const percentage = this.progress.total > 0 
      ? Math.round((this.progress.processed / this.progress.total) * 100)
      : 0;

    const elapsedMs = Date.now() - new Date(this.progress.startTime).getTime();
    const avgTimePerRecord = this.progress.processed > 0
      ? elapsedMs / this.progress.processed
      : 0;

    const remainingRecords = this.progress.total - this.progress.processed;
    const estimatedRemainingMs = remainingRecords * avgTimePerRecord;

    return {
      ...this.progress,
      percentage,
      avgTimePerRecord: Math.round(avgTimePerRecord),
      estimatedRemainingMs: Math.round(estimatedRemainingMs)
    };
  }

  getRecord(index) {
    return this.progress.records[index];
  }

  getAllRecords() {
    return this.progress.records;
  }

  async save() {
    try {
      await connection.set(
        this.redisKey,
        JSON.stringify(this.progress),
        'EX',
        config.redis.jobProgressTTL
      );
      logger.debug('Progress saved to Redis', { jobId: this.jobId, ttl: config.redis.jobProgressTTL });
    } catch (error) {
      logger.error('Error saving progress to Redis', { 
        jobId: this.jobId, 
        error: error.message 
      });
    }
  }

  async load() {
    try {
      const data = await connection.get(this.redisKey);
      
      if (!data) {
        logger.debug('No progress data found in Redis', { jobId: this.jobId });
        return null;
      }

      this.progress = JSON.parse(data);
      
      logger.debug('Progress loaded from Redis', { jobId: this.jobId });
      return this.progress;
    } catch (error) {
      logger.error('Error loading progress from Redis', { 
        jobId: this.jobId, 
        error: error.message 
      });
      return null;
    }
  }

  isComplete() {
    return this.progress.processed >= this.progress.total;
  }

  getStats() {
    return {
      total: this.progress.total,
      processed: this.progress.processed,
      success: this.progress.success,
      failed: this.progress.failed,
      skipped: this.progress.skipped,
      pending: this.progress.total - this.progress.processed
    };
  }

  async delete() {
    try {
      const result = await connection.del(this.redisKey);
      
      if (result === 1) {
        logger.info('Progress data deleted from Redis', { jobId: this.jobId });
      } else {
        logger.debug('No progress data found to delete in Redis', { jobId: this.jobId });
      }
    } catch (error) {
      logger.error('Error deleting progress data from Redis', { 
        jobId: this.jobId, 
        error: error.message 
      });
      throw error;
    }
  }
}

