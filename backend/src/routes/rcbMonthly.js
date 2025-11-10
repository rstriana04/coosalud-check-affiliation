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
    const result = await scraper.generateReport(startDate, endDate);

    res.json({
      success: true,
      message: 'Report generated, filtered, processed, and archived successfully',
      excelFilePath: result.excelFilePath,
      jsonFilePath: result.jsonFilePath,
      totalRows: result.totalRows,
      patientExcelFile: result.patientExcelFile,
      zipFilePath: result.zipFilePath,
      processingResults: result.processingResults,
      summary: {
        totalProcessed: result.processingResults.length,
        successful: result.processingResults.filter(r => r.status === 'success').length,
        failed: result.processingResults.filter(r => r.status === 'failed').length,
        pdfDownloaded: result.pdfFiles.length
      }
    });
  } catch (error) {
    logger.error('Error generating RCB Monthly report', { error: error.message });
    next(error);
  }
});

export default router;

