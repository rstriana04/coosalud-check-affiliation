import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, createReadStream, statSync } from 'fs';
import { RCBMonthlyScraper } from '../services/rcbMonthlyService.js';
import { RCVReportService } from '../services/rcvReportService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsDir = join(__dirname, '../../uploads');
mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Solo se permiten archivos .xls o .xlsx', 400));
    }
  }
});

const router = express.Router();
const activeJobs = new Map();

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
      message: 'Report generated successfully',
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

router.post('/generate-rcv', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const { email, limit } = req.body;
    const filePath = req.file.path;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    logger.info('Solicitud de generacion de informe RCV', {
      file: req.file.originalname,
      email: email || 'none',
      limit: parsedLimit || 'all'
    });

    if (email) {
      const jobId = `rcv-${Date.now()}`;
      activeJobs.set(jobId, { status: 'processing', startedAt: new Date().toISOString() });

      processInBackground(jobId, filePath, email, parsedLimit);

      return res.json({
        success: true,
        message: 'Procesamiento iniciado. Se enviara el resultado por email.',
        jobId
      });
    }

    const service = new RCVReportService();
    const result = await service.generateFromExcel(filePath, { limit: parsedLimit });

    res.json(result);
  } catch (error) {
    logger.error('Error en generacion de informe RCV', { error: error.message });
    next(error);
  }
});

router.get('/rcv-status/:jobId', (req, res) => {
  const job = activeJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job no encontrado' });
  }
  res.json(job);
});

router.get('/rcv-download/:jobId', (req, res, next) => {
  try {
    const job = activeJobs.get(req.params.jobId);
    if (!job || job.status !== 'completed' || !job.zipFilePath) {
      throw new AppError('Archivo no disponible', 404);
    }

    const stat = statSync(job.zipFilePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${job.fileName || 'rcv-report.zip'}"`);

    createReadStream(job.zipFilePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

async function processInBackground(jobId, filePath, email, limit) {
  try {
    const service = new RCVReportService();
    const result = await service.generateFromExcel(filePath, { email, limit });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary
    });

    logger.info('Background RCV job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    logger.error('Background RCV job failed', { jobId, error: error.message });
  }
}

export default router;
