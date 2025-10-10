import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { config } from '../config/config.js';
import { ExcelHandler, validateExcelFile } from '../utils/excelHandler.js';
import { ProgressService } from '../services/progressService.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { emitLog } from '../services/socketService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '../../uploads');
const PROCESSED_DIR = join(__dirname, '../../processed');

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!existsSync(PROCESSED_DIR)) {
  mkdirSync(PROCESSED_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const jobId = uuidv4();
    const filename = `${jobId}-${file.originalname}`;
    req.jobId = jobId;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only .xlsx and .xls files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxFileSize
  }
});

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const filePath = req.file.path;
    const jobId = req.jobId;

    logger.info('File uploaded', { 
      jobId, 
      filename: req.file.originalname,
      size: req.file.size 
    });

    const validation = await validateExcelFile(filePath);
    
    if (!validation.valid) {
      throw new AppError(validation.error, 400);
    }

    const excelHandler = new ExcelHandler(filePath);
    const records = await excelHandler.read();

    if (records.length === 0) {
      throw new AppError('No valid records found in Excel file', 400);
    }

    const progressService = new ProgressService(jobId);
    await progressService.initialize(records);

    emitLog('info', `File uploaded: ${records.length} records`, {
      filename: req.file.originalname
    });

    res.json({
      success: true,
      jobId,
      filename: req.file.originalname,
      totalRecords: records.length,
      message: 'File uploaded successfully. Ready to start processing.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

