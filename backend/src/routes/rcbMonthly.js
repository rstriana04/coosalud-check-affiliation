import express from 'express';
import { RCBMonthlyScraper } from '../services/rcbMonthlyService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    logger.info('Generating RCB Monthly report', { startDate, endDate });

    const scraper = new RCBMonthlyScraper();
    const filePath = await scraper.generateReport(startDate, endDate);

    res.json({
      success: true,
      message: 'Report generated successfully',
      filePath
    });
  } catch (error) {
    logger.error('Error generating RCB Monthly report', { error: error.message });
    next(error);
  }
});

export default router;

