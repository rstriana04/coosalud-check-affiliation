import express from 'express';
import { getQueueStatus } from '../services/queueService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const queueStatus = await getQueueStatus();

    res.json({
      success: true,
      stats: {
        queue: queueStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting stats', { error: error.message });
    next(error);
  }
});

export default router;

