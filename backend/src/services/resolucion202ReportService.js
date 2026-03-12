import { logger } from '../utils/logger.js';
import { databaseService } from './databaseService.js';
import { generateResolucion202Excel } from '../utils/resolucion202ExcelGenerator.js';
import { generateResolucion202Txt, generateResolucion202Filename } from '../utils/resolucion202TxtGenerator.js';
import { Resolucion202Validator } from '../utils/resolucion202Validator.js';
import { applyDefaults } from '../utils/resolucion202Defaults.js';
import { COLUMNS_202 } from '../utils/resolucion202Columns.js';
import ExcelJS from 'exceljs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, createWriteStream } from 'fs';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Resolucion202ReportService {
  constructor() {
    this.outputDir = join(__dirname, '../../processed');
  }

  async generateFromExcel(inputExcelPath, options = {}) {
    const { periodoInicio, periodoFin, codigoHabilitacion, codigoEntidad, email, jobId } = options;

    logger.info('Generating Resolucion 202 report from Excel', { inputExcelPath, periodoFin });

    const rawRecords = await this.readConsolidatedExcel(inputExcelPath);
    const records = rawRecords.map(record => applyDefaults(record, periodoFin));
    const validationResult = this.validateRecords(records, periodoInicio, periodoFin);
    const metadata = { periodoInicio, periodoFin, codigoHabilitacion };
    const controlRecord = this.buildControlRecord(options);

    return this.generateOutputFiles(records, metadata, controlRecord, validationResult, options);
  }

  async generateFromDatabase(options = {}) {
    const { reportingPeriod, periodoInicio, periodoFin, codigoHabilitacion, email, jobId } = options;

    logger.info('Generating Resolucion 202 report from database', { reportingPeriod });

    const rawRecords = databaseService.getPatientsByPeriod(reportingPeriod);

    if (rawRecords.length === 0) {
      throw new Error(`No patient records found for period ${reportingPeriod}`);
    }

    const records = rawRecords.map(record => applyDefaults(record, periodoFin));
    const validationResult = this.validateRecords(records, periodoInicio, periodoFin);
    const metadata = { periodoInicio, periodoFin, codigoHabilitacion };
    const controlRecord = this.buildControlRecord(options);

    return this.generateOutputFiles(records, metadata, controlRecord, validationResult, options);
  }

  async generateOutputFiles(records, metadata, controlRecord, validationResult, options) {
    this.ensureOutputDir();
    const ts = this.timestamp();
    const prefix = `${options.periodoFin}-resolucion-202`;

    const excelPath = join(this.outputDir, `${prefix}.xlsx`);
    const excelFilePath = await generateResolucion202Excel(records, excelPath, metadata);

    const txtFilename = this.buildTxtFilename(options);
    const txtPath = join(this.outputDir, txtFilename);
    const txtFilePath = generateResolucion202Txt(records, txtPath, controlRecord);

    const zipPath = join(this.outputDir, `${prefix}.zip`);
    const zipFilePath = await this.createZipArchive(
      [{ path: excelFilePath, name: `${prefix}.xlsx` }, { path: txtFilePath, name: txtFilename }],
      zipPath
    );

    logger.info('Resolucion 202 report generated', {
      records: records.length,
      excelFilePath,
      txtFilePath,
      zipFilePath,
    });

    return this.buildResponse(excelFilePath, txtFilePath, zipFilePath, records, validationResult);
  }

  buildTxtFilename(options) {
    return generateResolucion202Filename(
      options.periodoFin,
      'NI',
      options.codigoEntidad || '761471',
      options.regimen || 'S',
      1
    );
  }

  buildControlRecord(options) {
    return {
      codigoEntidad: options.codigoEntidad || '761471',
      fechaInicio: options.periodoInicio,
      fechaFin: options.periodoFin,
    };
  }

  validateRecords(records, periodoInicio, periodoFin) {
    const validator = new Resolucion202Validator(periodoInicio, periodoFin);
    return validator.validateFile(records);
  }

  buildResponse(excelFilePath, txtFilePath, zipFilePath, records, validationResult) {
    return {
      success: true,
      excelFilePath,
      txtFilePath,
      zipFilePath,
      summary: { totalRecords: records.length },
      validationResult,
    };
  }

  async readConsolidatedExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet || worksheet.rowCount < 2) {
      throw new Error(`Input Excel file is empty or has no data rows: ${filePath}`);
    }

    const headerRow = worksheet.getRow(1);
    const columnMapping = this.buildColumnMapping(headerRow);
    const records = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      records.push(this.mapExcelRowToRecord(row, columnMapping));
    });

    logger.info('Consolidated Excel read', { filePath, records: records.length });
    return records;
  }

  mapExcelRowToRecord(row, columnMapping) {
    const record = {};
    for (const [colIndex, fieldName] of Object.entries(columnMapping)) {
      const cell = row.getCell(Number(colIndex));
      record[fieldName] = this.extractCellValue(cell);
    }
    return record;
  }

  extractCellValue(cell) {
    if (cell.value === null || cell.value === undefined) return null;
    if (cell.value instanceof Date) return cell.value.toISOString().split('T')[0];
    if (typeof cell.value === 'object' && cell.value.result !== undefined) return cell.value.result;
    return cell.value;
  }

  buildColumnMapping(headerRow) {
    const labelToName = new Map();
    for (const col of COLUMNS_202) {
      labelToName.set(this.normalizeLabel(col.label), col.name);
    }

    const mapping = {};
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const normalized = this.normalizeLabel(String(cell.value || ''));
      if (labelToName.has(normalized)) {
        mapping[colNumber] = labelToName.get(normalized);
      }
    });

    logger.debug('Column mapping built', { mappedColumns: Object.keys(mapping).length });
    return mapping;
  }

  normalizeLabel(label) {
    return label.toLowerCase().replace(/[^a-z0-9\u00f1]/g, '').trim();
  }

  async createZipArchive(files, outputPath) {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info('ZIP archive created', { outputPath, size: archive.pointer() });
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        reject(new Error(`Failed to create ZIP archive: ${err.message}`));
      });

      archive.pipe(output);
      for (const file of files) {
        archive.file(file.path, { name: file.name });
      }
      archive.finalize();
    });
  }

  ensureOutputDir() {
    mkdirSync(this.outputDir, { recursive: true });
    return this.outputDir;
  }

  timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }
}
