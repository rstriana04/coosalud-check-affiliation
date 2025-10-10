import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Redis } from 'ioredis';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../uploads');
const DOWNLOADS_DIR = join(__dirname, '../../downloads');

const connection = new Redis(config.redis.url, {
  maxRetriesPerRequest: null
});

export class CleanupService {
  static async cleanupJob(jobId) {
    const deletedFiles = [];
    const deletedRedisKeys = [];
    
    try {
      const uploadFile = join(UPLOADS_DIR, `${jobId}.xlsx`);
      if (existsSync(uploadFile)) {
        await unlink(uploadFile);
        deletedFiles.push(uploadFile);
        logger.info('Deleted upload file', { file: uploadFile });
      }

      const progressKey = `job:${jobId}:progress`;
      const progressDeleted = await connection.del(progressKey);
      if (progressDeleted > 0) {
        deletedRedisKeys.push(progressKey);
        logger.info('Deleted progress data from Redis', { key: progressKey });
      }

      const failedRecordsKey = `job:${jobId}:failed_for_retry`;
      const failedDeleted = await connection.del(failedRecordsKey);
      if (failedDeleted > 0) {
        deletedRedisKeys.push(failedRecordsKey);
        logger.info('Deleted failed records from Redis', { key: failedRecordsKey });
      }

      logger.info('Job cleanup completed', { 
        jobId, 
        deletedFiles: deletedFiles.length,
        deletedRedisKeys: deletedRedisKeys.length
      });
      
      return { success: true, deletedFiles, deletedRedisKeys };
    } catch (error) {
      logger.error('Error during job cleanup', { jobId, error: error.message });
      return { success: false, error: error.message, deletedFiles, deletedRedisKeys };
    }
  }

  static async cleanupOldDownloads(maxAgeHours = 1) {
    try {
      const fs = await import('fs');
      const files = fs.readdirSync(DOWNLOADS_DIR);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let deleted = 0;

      for (const file of files) {
        const filePath = join(DOWNLOADS_DIR, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await unlink(filePath);
          deleted++;
          logger.debug('Deleted old download', { file, ageHours: age / (60 * 60 * 1000) });
        }
      }

      if (deleted > 0) {
        logger.info('Old downloads cleaned up', { deleted });
      }

      return { success: true, deleted };
    } catch (error) {
      logger.error('Error cleaning old downloads', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

