import { Router } from 'express';
import { JobHistoryService } from '../services/jobHistoryService.js';
import { logger } from '../utils/logger.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync } from 'fs';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROCESSED_DIR = join(__dirname, '../../processed');
const UPLOADS_DIR = join(__dirname, '../../uploads');
const PROGRESS_DIR = join(__dirname, '../../progress');

router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await JobHistoryService.getHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const jobData = await JobHistoryService.getJobData(jobId);
    
    if (!jobData) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: jobData
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    const processedFile = join(PROCESSED_DIR, `processed-${jobId}.xlsx`);
    if (existsSync(processedFile)) {
      unlinkSync(processedFile);
      logger.info('Deleted processed file', { file: processedFile });
    }

    const uploadFile = join(UPLOADS_DIR, `${jobId}.xlsx`);
    if (existsSync(uploadFile)) {
      unlinkSync(uploadFile);
      logger.info('Deleted upload file', { file: uploadFile });
    }

    const progressFile = join(PROGRESS_DIR, `${jobId}.json`);
    if (existsSync(progressFile)) {
      unlinkSync(progressFile);
      logger.info('Deleted progress file', { file: progressFile });
    }

    await JobHistoryService.deleteJob(jobId);
    
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

