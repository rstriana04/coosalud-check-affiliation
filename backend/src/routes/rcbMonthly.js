import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, createReadStream, statSync } from 'fs';
import { RCBMonthlyScraper } from '../services/rcbMonthlyService.js';
import { RCVReportService } from '../services/rcvReportService.js';
import { PediatricReportService } from '../services/pediatricReportService.js';
import { LifecycleReportService } from '../services/lifecycleReportService.js';
import { PlanificacionFamiliarReportService } from '../services/planificacionFamiliarReportService.js';
import { CitologiasReportService } from '../services/citologiasReportService.js';
import { GestantesReportService } from '../services/gestantesReportService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { emitLog } from '../services/socketService.js';

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

const TEMPLATES = {
  rcv: {
    filename: 'plantilla-riesgo-cardiovascular.xlsx',
    rows: [
      ['1112345678', '2026-01-15', 'JUAN PEREZ', 'riesgo-cardiovascular'],
      ['31425149', '2026-02-20', 'MARIA LOPEZ', 'riesgo-cardiovascular'],
    ]
  },
  pediatric: {
    filename: 'plantilla-pediatrico.xlsx',
    rows: [
      ['1098765432', '2026-01-10', 'CARLOS GARCIA', 'primera-infancia'],
      ['1087654321', '2026-02-15', 'ANA MARTINEZ', 'infancia'],
      ['1076543210', '2026-03-05', 'PEDRO SANCHEZ', 'adolescencia'],
    ]
  },
  lifecycle: {
    filename: 'plantilla-ciclo-de-vida.xlsx',
    rows: [
      ['1112345678', '2026-01-20', 'LAURA GOMEZ', 'juventud'],
      ['31425149', '2026-02-10', 'ROBERTO SILVA', 'adultez'],
      ['15432198', '2026-03-01', 'DIANA CASTRO', 'vejez'],
    ]
  },
  'planificacion-familiar': {
    filename: 'plantilla-planificacion-familiar.xlsx',
    rows: [
      ['31425149', '2026-01-25', 'EDNA UPEGUI', 'planificacion-familiar'],
      ['1112794611', '2026-02-15', 'CAROLINA MOLANO', 'planificacion-familiar'],
    ]
  },
  citologias: {
    filename: 'plantilla-citologias.xlsx',
    rows: [
      ['31425149', '2026-01-18', 'EDNA UPEGUI', 'citologias'],
      ['1112794611', '2026-02-22', 'CAROLINA MOLANO', 'citologias'],
    ]
  },
  'seguimiento-gestantes': {
    filename: 'plantilla-seguimiento-gestantes.xlsx',
    rows: [
      ['1112794611', '2026-01-28', 'EDNA UPEGUI', 'seguimiento-gestantes'],
      ['31425149', '28-01-2026', 'CAROLINA MOLANO', 'seguimiento-gestantes'],
    ]
  },
};

router.get('/template/:module', async (req, res, next) => {
  try {
    const template = TEMPLATES[req.params.module];
    if (!template) throw new AppError('Plantilla no encontrada', 404);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Plantilla');

    ws.columns = [
      { header: 'identipac', key: 'identipac', width: 15 },
      { header: 'fecha_atencion', key: 'fecha_atencion', width: 18 },
      { header: 'nombremedico', key: 'nombremedico', width: 25 },
      { header: 'programa', key: 'programa', width: 30 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };

    for (const row of template.rows) {
      ws.addRow(row);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

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
    const jobId = `rcv-${Date.now()}`;

    logger.info('Solicitud de generacion de informe RCV', {
      jobId,
      file: req.file.originalname,
      email: email || 'none',
      limit: parsedLimit || 'all'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      filename: req.file.originalname
    });

    processInBackground(jobId, filePath, email, parsedLimit);

    res.json({
      success: true,
      message: 'Procesamiento iniciado',
      jobId
    });
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

router.post('/generate-pediatric', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const { email, limit } = req.body;
    const filePath = req.file.path;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const jobId = `pediatric-${Date.now()}`;

    logger.info('Solicitud de generacion de informe pediatrico', {
      jobId, file: req.file.originalname,
      email: email || 'none', limit: parsedLimit || 'all'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      filename: req.file.originalname
    });

    processPediatricInBackground(jobId, filePath, email, parsedLimit);

    res.json({ success: true, message: 'Procesamiento iniciado', jobId });
  } catch (error) {
    logger.error('Error en generacion de informe pediatrico', { error: error.message });
    next(error);
  }
});

router.post('/generate-lifecycle', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const { email, limit } = req.body;
    const filePath = req.file.path;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const jobId = `lifecycle-${Date.now()}`;

    logger.info('Solicitud de generacion de informe ciclo de vida', {
      jobId, file: req.file.originalname,
      email: email || 'none', limit: parsedLimit || 'all'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      filename: req.file.originalname
    });

    processLifecycleInBackground(jobId, filePath, email, parsedLimit);

    res.json({ success: true, message: 'Procesamiento iniciado', jobId });
  } catch (error) {
    logger.error('Error en generacion de informe ciclo de vida', { error: error.message });
    next(error);
  }
});

router.post('/generate-planificacion-familiar', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const { email, limit } = req.body;
    const filePath = req.file.path;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const jobId = `planfamiliar-${Date.now()}`;

    logger.info('Solicitud de generacion de informe planificacion familiar', {
      jobId, file: req.file.originalname,
      email: email || 'none', limit: parsedLimit || 'all'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      filename: req.file.originalname
    });

    processPlanFamiliarInBackground(jobId, filePath, email, parsedLimit);

    res.json({ success: true, message: 'Procesamiento iniciado', jobId });
  } catch (error) {
    logger.error('Error en generacion de informe planificacion familiar', { error: error.message });
    next(error);
  }
});

router.post('/generate-citologias', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const { email, limit } = req.body;
    const filePath = req.file.path;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const jobId = `citologias-${Date.now()}`;

    logger.info('Solicitud de generacion de informe citologias', {
      jobId, file: req.file.originalname,
      email: email || 'none', limit: parsedLimit || 'all'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      filename: req.file.originalname
    });

    processCitologiasInBackground(jobId, filePath, email, parsedLimit);

    res.json({ success: true, message: 'Procesamiento iniciado', jobId });
  } catch (error) {
    logger.error('Error en generacion de informe citologias', { error: error.message });
    next(error);
  }
});

router.post('/generate-gestantes', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const { email, limit } = req.body;
    const filePath = req.file.path;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const jobId = `gestantes-${Date.now()}`;

    logger.info('Solicitud de generacion de informe gestantes', {
      jobId, file: req.file.originalname,
      email: email || 'none', limit: parsedLimit || 'all'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      filename: req.file.originalname
    });

    processGestantesInBackground(jobId, filePath, email, parsedLimit);

    res.json({ success: true, message: 'Procesamiento iniciado', jobId });
  } catch (error) {
    logger.error('Error en generacion de informe gestantes', { error: error.message });
    next(error);
  }
});

async function processGestantesInBackground(jobId, filePath, email, limit) {
  try {
    const service = new GestantesReportService();
    const result = await service.generateFromExcel(filePath, { email, limit, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      results: result.results
    });

    emitLog('success', 'Procesamiento gestantes completado', { jobId });
    logger.info('Background gestantes job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Procesamiento gestantes fallido: ${error.message}`, { jobId });
    logger.error('Background gestantes job failed', { jobId, error: error.message });
  }
}

async function processPlanFamiliarInBackground(jobId, filePath, email, limit) {
  try {
    const service = new PlanificacionFamiliarReportService();
    const result = await service.generateFromExcel(filePath, { email, limit, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      results: result.results
    });

    emitLog('success', 'Procesamiento planificacion familiar completado', { jobId });
    logger.info('Background planificacion familiar job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Procesamiento planificacion familiar fallido: ${error.message}`, { jobId });
    logger.error('Background planificacion familiar job failed', { jobId, error: error.message });
  }
}

async function processCitologiasInBackground(jobId, filePath, email, limit) {
  try {
    const service = new CitologiasReportService();
    const result = await service.generateFromExcel(filePath, { email, limit, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      results: result.results
    });

    emitLog('success', 'Procesamiento citologias completado', { jobId });
    logger.info('Background citologias job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Procesamiento citologias fallido: ${error.message}`, { jobId });
    logger.error('Background citologias job failed', { jobId, error: error.message });
  }
}

async function processLifecycleInBackground(jobId, filePath, email, limit) {
  try {
    const service = new LifecycleReportService();
    const result = await service.generateFromExcel(filePath, { email, limit, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      results: result.results
    });

    emitLog('success', 'Procesamiento ciclo de vida completado', { jobId });
    logger.info('Background lifecycle job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Procesamiento ciclo de vida fallido: ${error.message}`, { jobId });
    logger.error('Background lifecycle job failed', { jobId, error: error.message });
  }
}

async function processPediatricInBackground(jobId, filePath, email, limit) {
  try {
    const service = new PediatricReportService();
    const result = await service.generateFromExcel(filePath, { email, limit, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      results: result.results
    });

    emitLog('success', 'Procesamiento pediatrico completado', { jobId });
    logger.info('Background pediatric job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Procesamiento pediatrico fallido: ${error.message}`, { jobId });
    logger.error('Background pediatric job failed', { jobId, error: error.message });
  }
}

async function processInBackground(jobId, filePath, email, limit) {
  try {
    const service = new RCVReportService();
    const result = await service.generateFromExcel(filePath, { email, limit, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      results: result.results
    });

    emitLog('success', 'Procesamiento completado', { jobId });
    logger.info('Background RCV job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Procesamiento fallido: ${error.message}`, { jobId });
    logger.error('Background RCV job failed', { jobId, error: error.message });
  }
}

export default router;
