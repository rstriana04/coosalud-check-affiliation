import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { RCBMonthlyScraper } from './rcbMonthlyService.js';
import { readInputExcel } from '../utils/inputExcelReader.js';
import { PediatricDataExtractor } from '../utils/pediatricDataExtractor.js';
import { generatePediatricExcel } from '../utils/pediatricExcelGenerator.js';
import { sendReportEmail } from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import { emitJobProgress, emitLog, emitJobCompleted, emitJobFailed } from './socketService.js';
import { databaseService } from './databaseService.js';
import { mapToResolucion202, deriveReportingPeriod } from '../utils/resolucion202Mapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VALID_PROGRAMS = ['primera-infancia', 'infancia', 'adolescencia'];

export class PediatricReportService {
  constructor() {
    this.scraper = new RCBMonthlyScraper();
  }

  async generateFromExcel(inputExcelPath, options = {}) {
    const { email, limit, jobId } = options;
    let results = [];
    let excelFilePath = null;
    let zipFilePath = null;

    try {
      this.emitLog(jobId, 'info', 'Leyendo archivo Excel...');
      const { patients: allPatients } = await readInputExcel(inputExcelPath);
      const patients = limit ? allPatients.slice(0, limit) : allPatients;

      const grouped = this.groupByProgram(patients);
      const programCounts = Object.entries(grouped)
        .map(([p, arr]) => `${p}: ${arr.length}`)
        .join(', ');

      this.emitLog(jobId, 'info', `${patients.length} pacientes encontrados (${programCounts})`);

      logger.info('Iniciando generacion de informe pediatrico', {
        totalPatients: patients.length,
        programs: programCounts,
        email: email || 'none'
      });

      this.emitLog(jobId, 'info', 'Iniciando sesion en Macaw...');
      await this.scraper.initialize();
      await this.scraper.login();
      this.emitLog(jobId, 'success', 'Sesion iniciada correctamente');

      this.emitProgress(jobId, {
        total: patients.length, processed: 0,
        success: 0, failed: 0, percentage: 0
      });

      results = await this.processPatients(patients, jobId);

      const dataByProgram = {};
      for (const programa of VALID_PROGRAMS) {
        dataByProgram[programa] = results
          .filter(r => r.status === 'success' && r.programa === programa)
          .map(r => r.extractedData);
      }

      const totalSuccess = Object.values(dataByProgram)
        .reduce((s, arr) => s + arr.length, 0);

      if (totalSuccess === 0) {
        this.emitLog(jobId, 'warning', 'Ningun paciente procesado exitosamente');
        return this.buildResponse(results, null, null);
      }

      this.emitLog(jobId, 'info', 'Generando Excel pediatrico...');
      const outputDir = this.ensureOutputDir();
      const timestamp = this.timestamp();
      const filePrefix = `pediatrico-${this.today()}`;

      const excelPath = join(outputDir, `${filePrefix}-${timestamp}.xlsx`);
      excelFilePath = await generatePediatricExcel(dataByProgram, excelPath);

      const pdfFiles = results.filter(r => r.pdfPath).map(r => r.pdfPath);

      this.emitLog(jobId, 'info', 'Creando archivo ZIP...');
      const zipPath = join(outputDir, `${filePrefix}-${timestamp}.zip`);
      zipFilePath = await this.scraper.createZipArchive(pdfFiles, excelFilePath, zipPath);

      if (email && zipFilePath) {
        this.emitLog(jobId, 'info', `Enviando email a ${email}...`);
        await this.sendEmail(email, zipFilePath, results);
        this.emitLog(jobId, 'success', 'Email enviado correctamente');
      }

      return this.buildResponse(results, excelFilePath, zipFilePath);
    } catch (error) {
      logger.error('Error generando informe pediatrico', { error: error.message });
      this.emitLog(jobId, 'error', `Error fatal: ${error.message}`);
      throw error;
    } finally {
      await this.scraper.close();
    }
  }

  groupByProgram(patients) {
    const grouped = {};
    for (const p of patients) {
      const prog = (p.programa || '').toLowerCase().trim();
      if (!VALID_PROGRAMS.includes(prog)) {
        logger.warn('Programa no reconocido, omitiendo', {
          identipac: p.identipac, programa: p.programa
        });
        continue;
      }
      if (!grouped[prog]) grouped[prog] = [];
      grouped[prog].push({ ...p, programa: prog });
    }
    return grouped;
  }

  async processPatients(patients, jobId) {
    const results = [];
    const MAX_RETRIES = 3;
    let successCount = 0;
    let failedCount = 0;

    const validPatients = patients.filter(p => {
      const prog = (p.programa || '').toLowerCase().trim();
      return VALID_PROGRAMS.includes(prog);
    });

    for (let i = 0; i < validPatients.length; i++) {
      const patient = validPatients[i];
      const programa = patient.programa.toLowerCase().trim();
      const logPrefix = `[${i + 1}/${validPatients.length}]`;
      let lastError = null;

      this.emitLog(jobId, 'info', `${logPrefix} Procesando ${patient.identipac} (${programa})`, {
        fecha: patient.fecha_atencion
      });

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            this.emitLog(jobId, 'warning', `${logPrefix} Reintento ${attempt}/${MAX_RETRIES}`);
            await this.scraper.page.waitForTimeout(2000 * attempt);
          }

          const result = await this.processOnePatient(patient, programa, logPrefix, jobId);
          results.push(result);
          lastError = null;
          successCount++;
          this.emitLog(jobId, 'success', `${logPrefix} ${patient.identipac} procesado`);
          break;
        } catch (error) {
          lastError = error;
          logger.warn(`${logPrefix} Intento ${attempt} fallido`, {
            identipac: patient.identipac, error: error.message
          });
          if (attempt < MAX_RETRIES) await this.recoverFromError();
        }
      }

      if (lastError) {
        failedCount++;
        this.emitLog(jobId, 'error', `${logPrefix} Fallido: ${patient.identipac} - ${lastError.message}`);
        results.push({
          rowNumber: patient.rowNumber,
          identipac: patient.identipac,
          fecha: patient.fecha_atencion,
          programa,
          pdfPath: null,
          extractedData: null,
          status: 'failed',
          error: lastError.message
        });
      }

      this.emitProgress(jobId, {
        total: validPatients.length,
        processed: i + 1,
        success: successCount,
        failed: failedCount,
        percentage: Math.round(((i + 1) / validPatients.length) * 100)
      });

      if (i < validPatients.length - 1) {
        await this.scraper.page.waitForTimeout(1000);
      }
    }

    return results;
  }

  async processOnePatient(patient, programa, logPrefix, jobId) {
    this.emitLog(jobId, 'info', `${logPrefix} Navegando a historia clinica...`);
    await this.scraper.navigateToPatientHistory();

    this.emitLog(jobId, 'info', `${logPrefix} Buscando paciente ${patient.identipac}...`);
    const patientId = await this.scraper.searchPatient(patient.identipac);

    this.emitLog(jobId, 'info', `${logPrefix} Buscando cita del ${patient.fecha_atencion}...`);
    const codCita = await this.scraper.filterAndExtractCodCita(patient.fecha_atencion);

    if (!codCita) {
      throw new Error(`CodCita no encontrado para fecha ${patient.fecha_atencion}`);
    }

    this.emitLog(jobId, 'info', `${logPrefix} CodCita: ${codCita}, descargando PDF...`);
    const pdfPath = await this.scraper.downloadPatientPDF(
      codCita, patientId, patient.identipac, patient.fecha_atencion
    );

    this.emitLog(jobId, 'info', `${logPrefix} Extrayendo datos (${programa})...`);
    const extractor = new PediatricDataExtractor(pdfPath, programa);
    const extractedData = await extractor.extract(patient.fecha_atencion, patient.nombremedico);

    try {
      const reportingPeriod = deriveReportingPeriod(patient.fecha_atencion);
      const res202Record = mapToResolucion202(extractedData, programa, reportingPeriod);
      await databaseService.upsertPatientRecord(res202Record);
    } catch (dbError) {
      logger.warn('Failed to save to Supabase, continuing', {
        patient: patient.identipac, error: dbError.message
      });
    }

    return {
      rowNumber: patient.rowNumber,
      identipac: patient.identipac,
      fecha: patient.fecha_atencion,
      programa,
      patientId,
      codCita,
      pdfPath,
      extractedData,
      status: 'success'
    };
  }

  emitProgress(jobId, progress) {
    if (!jobId) return;
    emitJobProgress(jobId, progress);
  }

  emitLog(jobId, level, message, data = {}) {
    if (!jobId) return;
    emitLog(level, message, { ...data, jobId });
  }

  async recoverFromError() {
    try {
      const page = this.scraper.page;
      if (!page || page.isClosed()) {
        await this.reinitializeScraper();
        return;
      }

      await page.goto(this.scraper.baseUrl + 'administrador/', {
        waitUntil: 'networkidle', timeout: 30000
      });

      const menuVisible = await page.$('#menu2');
      if (!menuVisible) {
        await this.reinitializeScraper();
        return;
      }
    } catch (_) {
      await this.reinitializeScraper();
    }
  }

  async reinitializeScraper() {
    try { await this.scraper.close(); } catch (_) {}
    await this.scraper.initialize();
    await this.scraper.login();
  }

  async sendEmail(to, zipPath, results) {
    try {
      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        programa: 'Pediatrico',
        fecha: this.today()
      };
      await sendReportEmail(to, zipPath, summary);
    } catch (error) {
      logger.error('Error enviando email (no bloquea)', { error: error.message });
    }
  }

  buildResponse(results, excelFilePath, zipFilePath) {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return {
      success: successful > 0,
      excelFilePath,
      zipFilePath,
      programa: 'pediatrico',
      summary: { total: results.length, successful, failed },
      results: results.map(r => ({
        identipac: r.identipac,
        fecha: r.fecha,
        programa: r.programa,
        status: r.status,
        error: r.error || null
      }))
    };
  }

  ensureOutputDir() {
    const dir = join(__dirname, '../../processed');
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  today() {
    return new Date().toISOString().split('T')[0];
  }
}
