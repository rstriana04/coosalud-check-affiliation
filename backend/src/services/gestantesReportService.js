import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { RCBMonthlyScraper } from './rcbMonthlyService.js';
import { readInputExcel } from '../utils/inputExcelReader.js';
import { GestantesDataExtractor } from '../utils/gestantesDataExtractor.js';
import { generateGestantesExcel } from '../utils/gestantesExcelGenerator.js';
import { sendReportEmail } from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import { emitJobProgress, emitLog } from './socketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class GestantesReportService {
  constructor() {
    this.scraper = new RCBMonthlyScraper();
  }

  async generateFromExcel(inputExcelPath, options = {}) {
    const { email, limit, jobId } = options;
    let results = [];

    try {
      this.emitLog(jobId, 'info', 'Leyendo archivo Excel...');
      const { patients: allPatients } = await readInputExcel(inputExcelPath);
      const patients = limit ? allPatients.slice(0, limit) : allPatients;

      this.emitLog(jobId, 'info', `${patients.length} pacientes encontrados`);

      this.emitLog(jobId, 'info', 'Iniciando sesion en Macaw...');
      await this.scraper.initialize();
      await this.scraper.login();
      this.emitLog(jobId, 'success', 'Sesion iniciada correctamente');

      this.emitProgress(jobId, {
        total: patients.length, processed: 0,
        success: 0, failed: 0, percentage: 0
      });

      results = await this.processPatients(patients, jobId);

      const successData = results
        .filter(r => r.status === 'success')
        .map(r => r.extractedData);

      if (successData.length === 0) {
        this.emitLog(jobId, 'warning', 'Ningun paciente procesado exitosamente');
        return this.buildResponse(results, null, null);
      }

      this.emitLog(jobId, 'info', 'Generando Excel gestantes...');
      const outputDir = this.ensureOutputDir();
      const timestamp = this.timestamp();
      const filePrefix = `seguimiento-gestantes-${this.today()}`;

      const excelPath = join(outputDir, `${filePrefix}-${timestamp}.xlsx`);
      await generateGestantesExcel(successData, excelPath);

      const pdfFiles = results.filter(r => r.pdfPath).map(r => r.pdfPath);

      this.emitLog(jobId, 'info', 'Creando archivo ZIP...');
      const zipPath = join(outputDir, `${filePrefix}-${timestamp}.zip`);
      const zipFilePath = await this.scraper.createZipArchive(
        pdfFiles, excelPath, zipPath
      );

      if (email && zipFilePath) {
        this.emitLog(jobId, 'info', `Enviando email a ${email}...`);
        await this.sendEmail(email, zipFilePath, results);
        this.emitLog(jobId, 'success', 'Email enviado correctamente');
      }

      return this.buildResponse(results, excelPath, zipFilePath);
    } catch (error) {
      logger.error('Error generando informe gestantes', {
        error: error.message
      });
      this.emitLog(jobId, 'error', `Error fatal: ${error.message}`);
      throw error;
    } finally {
      await this.scraper.close();
    }
  }

  async processPatients(patients, jobId) {
    const results = [];
    const MAX_RETRIES = 3;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const logPrefix = `[${i + 1}/${patients.length}]`;
      let lastError = null;

      this.emitLog(jobId, 'info',
        `${logPrefix} Procesando ${patient.identipac}`,
        { fecha: patient.fecha_atencion }
      );

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            this.emitLog(jobId, 'warning',
              `${logPrefix} Reintento ${attempt}/${MAX_RETRIES}`
            );
            await this.scraper.page.waitForTimeout(2000 * attempt);
          }

          const result = await this.processOnePatient(
            patient, logPrefix, jobId
          );
          results.push(result);
          lastError = null;
          successCount++;
          this.emitLog(jobId, 'success',
            `${logPrefix} ${patient.identipac} procesado`
          );
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
        this.emitLog(jobId, 'error',
          `${logPrefix} Fallido: ${patient.identipac} - ${lastError.message}`
        );
        results.push({
          rowNumber: patient.rowNumber, identipac: patient.identipac,
          fecha: patient.fecha_atencion, programa: 'seguimiento-gestantes',
          pdfPath: null, extractedData: null,
          status: 'failed', error: lastError.message
        });
      }

      this.emitProgress(jobId, {
        total: patients.length, processed: i + 1,
        success: successCount, failed: failedCount,
        percentage: Math.round(((i + 1) / patients.length) * 100)
      });

      if (i < patients.length - 1) {
        await this.scraper.page.waitForTimeout(1000);
      }
    }

    return results;
  }

  async processOnePatient(patient, logPrefix, jobId) {
    let fecha = patient.fecha_atencion;
    if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) {
      const [d, m, y] = fecha.split('-');
      fecha = `${y}-${m}-${d}`;
    }

    this.emitLog(jobId, 'info',
      `${logPrefix} Navegando a historia clinica...`
    );
    await this.scraper.navigateToPatientHistory();

    this.emitLog(jobId, 'info',
      `${logPrefix} Buscando paciente ${patient.identipac}...`
    );
    const patientId = await this.scraper.searchPatient(patient.identipac);

    this.emitLog(jobId, 'info',
      `${logPrefix} Buscando cita del ${fecha}...`
    );
    const codCita = await this.scraper.filterAndExtractCodCita(fecha);

    if (!codCita) {
      throw new Error(`CodCita no encontrado para fecha ${fecha}`);
    }

    this.emitLog(jobId, 'info',
      `${logPrefix} CodCita: ${codCita}, descargando PDF...`
    );
    const pdfPath = await this.scraper.downloadPatientPDF(
      codCita, patientId, patient.identipac, fecha
    );

    this.emitLog(jobId, 'info', `${logPrefix} Extrayendo datos...`);
    const extractor = new GestantesDataExtractor(pdfPath);
    const extractedData = await extractor.extract(
      fecha, patient.nombremedico
    );

    return {
      rowNumber: patient.rowNumber, identipac: patient.identipac,
      fecha, programa: 'seguimiento-gestantes',
      patientId, codCita, pdfPath, extractedData, status: 'success'
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
        programa: 'Seguimiento Gestantes',
        fecha: this.today()
      };
      await sendReportEmail(to, zipPath, summary);
    } catch (error) {
      logger.error('Error enviando email (no bloquea)', {
        error: error.message
      });
    }
  }

  buildResponse(results, excelFilePath, zipFilePath) {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    return {
      success: successful > 0, excelFilePath, zipFilePath,
      programa: 'seguimiento-gestantes',
      summary: { total: results.length, successful, failed },
      results: results.map(r => ({
        identipac: r.identipac, fecha: r.fecha,
        programa: r.programa, status: r.status, error: r.error || null
      }))
    };
  }

  ensureOutputDir() {
    const dir = join(__dirname, '../../processed');
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  timestamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
  today() { return new Date().toISOString().split('T')[0]; }
}
