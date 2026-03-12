import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, createReadStream, statSync } from 'fs';
import { Resolucion202ReportService } from '../services/resolucion202ReportService.js';
import { Resolucion202Validator } from '../utils/resolucion202Validator.js';
import { databaseService } from '../services/databaseService.js';
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

router.post('/generate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const {
      periodoInicio,
      periodoFin,
      codigoHabilitacion = '761471222301',
      codigoEntidad = '761471',
      regimen = 'S',
      email
    } = req.body;

    if (!periodoInicio || !periodoFin) {
      throw new AppError('Se requieren periodoInicio y periodoFin', 400);
    }

    const filePath = req.file.path;
    const jobId = `res202-${Date.now()}`;

    logger.info('Solicitud de generacion Resolucion 202', {
      jobId,
      file: req.file.originalname,
      periodoInicio,
      periodoFin,
      email: email || 'none'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      filename: req.file.originalname
    });

    processResolucion202InBackground(jobId, filePath, {
      periodoInicio,
      periodoFin,
      codigoHabilitacion,
      codigoEntidad,
      regimen,
      email
    });

    res.json({ success: true, message: 'Procesamiento iniciado', jobId });
  } catch (error) {
    logger.error('Error en generacion Resolucion 202', { error: error.message });
    next(error);
  }
});

router.post('/generate-from-db', async (req, res, next) => {
  try {
    const {
      reportingPeriod,
      periodoInicio,
      periodoFin,
      codigoHabilitacion = '761471222301',
      codigoEntidad = '761471',
      regimen = 'S',
      email
    } = req.body;

    if (!periodoInicio || !periodoFin) {
      throw new AppError('Se requieren periodoInicio y periodoFin', 400);
    }

    const jobId = `res202-${Date.now()}`;

    logger.info('Solicitud de generacion Resolucion 202 desde BD', {
      jobId,
      reportingPeriod,
      periodoInicio,
      periodoFin,
      email: email || 'none'
    });

    activeJobs.set(jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      source: 'database',
      reportingPeriod
    });

    processResolucion202FromDbInBackground(jobId, {
      reportingPeriod,
      periodoInicio,
      periodoFin,
      codigoHabilitacion,
      codigoEntidad,
      regimen,
      email
    });

    res.json({ success: true, message: 'Procesamiento iniciado', jobId });
  } catch (error) {
    logger.error('Error en generacion Resolucion 202 desde BD', { error: error.message });
    next(error);
  }
});

router.post('/validate', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('Se requiere un archivo Excel', 400);
    }

    const { periodoInicio, periodoFin } = req.body;

    if (!periodoInicio || !periodoFin) {
      throw new AppError('Se requieren periodoInicio y periodoFin', 400);
    }

    const service = new Resolucion202ReportService();
    const records = await service.readConsolidatedExcel(req.file.path);

    const validator = new Resolucion202Validator(periodoInicio, periodoFin);
    const validationResult = validator.validateFile(records);

    res.json({
      valid: validationResult.totalErrors === 0,
      totalRecords: validationResult.totalRecords,
      totalErrors: validationResult.totalErrors,
      totalWarnings: validationResult.totalWarnings,
      recordErrors: validationResult.recordErrors,
      summary: validationResult.summary
    });
  } catch (error) {
    logger.error('Error en validacion Resolucion 202', { error: error.message });
    next(error);
  }
});

router.get('/status/:jobId', (req, res) => {
  const job = activeJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job no encontrado' });
  }
  res.json(job);
});

router.get('/download/:jobId', (req, res, next) => {
  try {
    const job = activeJobs.get(req.params.jobId);
    if (!job || job.status !== 'completed' || !job.zipFilePath) {
      throw new AppError('Archivo no disponible', 404);
    }

    const stat = statSync(job.zipFilePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${job.fileName || 'resolucion-202.zip'}"`);

    createReadStream(job.zipFilePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

router.get('/periods', async (req, res, next) => {
  try {
    const periods = await databaseService.getReportingPeriods();
    res.json({ success: true, periods });
  } catch (error) {
    logger.error('Error obteniendo periodos', { error: error.message });
    next(error);
  }
});

router.get('/patient-count/:period', async (req, res, next) => {
  try {
    const count = await databaseService.getPatientCount(req.params.period);
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Error obteniendo conteo de pacientes', { error: error.message });
    next(error);
  }
});

async function processResolucion202InBackground(jobId, filePath, options) {
  try {
    const service = new Resolucion202ReportService();
    const result = await service.generateFromExcel(filePath, { ...options, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      txtFilePath: result.txtFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      validationResult: result.validationResult
    });

    emitLog('success', 'Generacion Resolucion 202 completada', { jobId });
    logger.info('Background Resolucion 202 job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Generacion Resolucion 202 fallida: ${error.message}`, { jobId });
    logger.error('Background Resolucion 202 job failed', { jobId, error: error.message });
  }
}

async function processResolucion202FromDbInBackground(jobId, options) {
  try {
    const service = new Resolucion202ReportService();
    const result = await service.generateFromDatabase({ ...options, jobId });

    activeJobs.set(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      zipFilePath: result.zipFilePath,
      excelFilePath: result.excelFilePath,
      txtFilePath: result.txtFilePath,
      fileName: result.zipFilePath ? result.zipFilePath.split('/').pop() : null,
      summary: result.summary,
      validationResult: result.validationResult
    });

    emitLog('success', 'Generacion Resolucion 202 desde BD completada', { jobId });
    logger.info('Background Resolucion 202 from DB job completed', { jobId });
  } catch (error) {
    activeJobs.set(jobId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    });

    emitLog('error', `Generacion Resolucion 202 desde BD fallida: ${error.message}`, { jobId });
    logger.error('Background Resolucion 202 from DB job failed', { jobId, error: error.message });
  }
}

export default router;
