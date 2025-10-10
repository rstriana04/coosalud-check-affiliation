import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { RecordStatus } from '../../../shared/types.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROGRESS_DIR = join(__dirname, '../../progress');

export class ProgressService {
  constructor(jobId) {
    this.jobId = jobId;
    this.progressFile = join(PROGRESS_DIR, `${jobId}.json`);
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
    await this.ensureProgressDir();
    
    this.progress.total = records.length;
    this.progress.records = records.map((record, index) => ({
      index,
      tipoDocumento: record.tipoDocumento,
      numeroDocumento: record.numeroDocumento,
      status: RecordStatus.PENDING,
      fechaAfiliacion: null,
      error: null,
      attempts: 0
    }));

    await this.save();
    logger.info('Progress initialized', { jobId: this.jobId, total: records.length });
  }

  async updateRecord(index, status, data = {}) {
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
      await writeFile(this.progressFile, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      logger.error('Error saving progress', { 
        jobId: this.jobId, 
        error: error.message 
      });
    }
  }

  async load() {
    try {
      if (!existsSync(this.progressFile)) {
        return null;
      }

      const data = await readFile(this.progressFile, 'utf-8');
      this.progress = JSON.parse(data);
      
      logger.info('Progress loaded', { jobId: this.jobId });
      return this.progress;
    } catch (error) {
      logger.error('Error loading progress', { 
        jobId: this.jobId, 
        error: error.message 
      });
      return null;
    }
  }

  async ensureProgressDir() {
    try {
      if (!existsSync(PROGRESS_DIR)) {
        await mkdir(PROGRESS_DIR, { recursive: true });
      }
    } catch (error) {
      logger.error('Error creating progress directory', { error: error.message });
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
}

