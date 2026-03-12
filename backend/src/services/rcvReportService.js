import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { RCBMonthlyScraper } from './rcbMonthlyService.js';
import { readInputExcel } from '../utils/inputExcelReader.js';
import { RCVDataExtractor } from '../utils/rcvDataExtractor.js';
import { generateRCVExcel } from '../utils/rcvExcelGenerator.js';
import { getLastPA, savePatientVisit } from '../utils/patientDataStore.js';
import { sendReportEmail } from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import { emitJobProgress, emitLog, emitJobCompleted, emitJobFailed } from './socketService.js';
import { databaseService } from './databaseService.js';
import { mapToResolucion202, deriveReportingPeriod } from '../utils/resolucion202Mapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class RCVReportService {
  constructor() {
    this.scraper = new RCBMonthlyScraper();
  }

  async generateFromExcel(inputExcelPath, options = {}) {
    const { email, limit, jobId } = options;
    let results = [];
    let excelFilePath = null;
    let zipFilePath = null;

    try {
      this.emitRcvLog(jobId, 'info', 'Leyendo archivo Excel...');
      const { patients: allPatients, programa } = await readInputExcel(inputExcelPath);
      const patients = limit ? allPatients.slice(0, limit) : allPatients;

      this.emitRcvLog(jobId, 'info', `${patients.length} pacientes encontrados`, {
        total: patients.length,
        originalTotal: allPatients.length,
        programa
      });

      logger.info('Iniciando generacion de informe RCV', {
        totalPatients: patients.length,
        originalTotal: allPatients.length,
        programa,
        email: email || 'none'
      });

      this.emitRcvLog(jobId, 'info', 'Iniciando sesion en Macaw...');
      await this.scraper.initialize();
      await this.scraper.login();
      this.emitRcvLog(jobId, 'success', 'Sesion iniciada correctamente');

      this.emitRcvProgress(jobId, {
        total: patients.length,
        processed: 0,
        success: 0,
        failed: 0,
        percentage: 0
      });

      results = await this.processPatients(patients, jobId);

      const successfulData = results
        .filter(r => r.status === 'success')
        .map(r => r.rcvData);

      if (successfulData.length === 0) {
        this.emitRcvLog(jobId, 'warning', 'Ningun paciente procesado exitosamente');
        logger.warn('Ningun paciente procesado exitosamente');
        return this.buildResponse(results, null, null, programa);
      }

      this.emitRcvLog(jobId, 'info', 'Generando Excel RCV...');
      const outputDir = this.ensureOutputDir();
      const timestamp = this.timestamp();
      const filePrefix = programa || `${this.today()}-202-informe`;

      const excelPath = join(outputDir, `${filePrefix}-${timestamp}.xlsx`);
      excelFilePath = await generateRCVExcel(successfulData, excelPath, programa);

      const pdfFiles = results
        .filter(r => r.pdfPath)
        .map(r => r.pdfPath);

      this.emitRcvLog(jobId, 'info', 'Creando archivo ZIP...');
      const zipPath = join(outputDir, `${filePrefix}-${timestamp}.zip`);
      zipFilePath = await this.scraper.createZipArchive(
        pdfFiles, excelFilePath, zipPath
      );

      if (email && zipFilePath) {
        this.emitRcvLog(jobId, 'info', `Enviando email a ${email}...`);
        await this.sendEmail(email, zipFilePath, results, programa);
        this.emitRcvLog(jobId, 'success', 'Email enviado correctamente');
      }

      return this.buildResponse(results, excelFilePath, zipFilePath, programa);
    } catch (error) {
      logger.error('Error generando informe RCV', { error: error.message });
      this.emitRcvLog(jobId, 'error', `Error fatal: ${error.message}`);
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

      this.emitRcvLog(jobId, 'info', `${logPrefix} Procesando paciente ${patient.identipac}`, {
        fecha: patient.fecha_atencion
      });

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            this.emitRcvLog(jobId, 'warning', `${logPrefix} Reintento ${attempt}/${MAX_RETRIES} para ${patient.identipac}`);
            logger.info(`${logPrefix} Reintento ${attempt}/${MAX_RETRIES}`, {
              identipac: patient.identipac
            });
            await this.scraper.page.waitForTimeout(2000 * attempt);
          }

          const result = await this.processOnePatient(patient, logPrefix, jobId);
          results.push(result);
          lastError = null;
          successCount++;

          this.emitRcvLog(jobId, 'success', `${logPrefix} Paciente ${patient.identipac} procesado exitosamente`);
          break;
        } catch (error) {
          lastError = error;
          logger.warn(`${logPrefix} Intento ${attempt} fallido`, {
            identipac: patient.identipac,
            error: error.message
          });

          if (attempt < MAX_RETRIES) {
            await this.recoverFromError();
          }
        }
      }

      if (lastError) {
        failedCount++;
        this.emitRcvLog(jobId, 'error', `${logPrefix} Fallido: ${patient.identipac} - ${lastError.message}`);
        logger.error(`${logPrefix} Fallido tras ${MAX_RETRIES} intentos`, {
          identipac: patient.identipac,
          error: lastError.message
        });

        results.push({
          rowNumber: patient.rowNumber,
          identipac: patient.identipac,
          fecha: patient.fecha_atencion,
          pdfPath: null,
          rcvData: null,
          status: 'failed',
          error: lastError.message
        });
      }

      this.emitRcvProgress(jobId, {
        total: patients.length,
        processed: i + 1,
        success: successCount,
        failed: failedCount,
        percentage: Math.round(((i + 1) / patients.length) * 100)
      });

      if (i < patients.length - 1) {
        await this.scraper.page.waitForTimeout(1000);
      }
    }

    return results;
  }

  async processOnePatient(patient, logPrefix, jobId) {
    this.emitRcvLog(jobId, 'info', `${logPrefix} Navegando a historia clinica...`);
    await this.scraper.navigateToPatientHistory();

    this.emitRcvLog(jobId, 'info', `${logPrefix} Buscando paciente ${patient.identipac}...`);
    const patientId = await this.scraper.searchPatient(patient.identipac);

    this.emitRcvLog(jobId, 'info', `${logPrefix} Buscando cita del ${patient.fecha_atencion}...`);
    const codCita = await this.scraper.filterAndExtractCodCita(patient.fecha_atencion);

    if (!codCita) {
      throw new Error(`CodCita no encontrado para fecha ${patient.fecha_atencion}`);
    }

    this.emitRcvLog(jobId, 'info', `${logPrefix} CodCita: ${codCita}, descargando PDF...`);
    const pdfPath = await this.scraper.downloadPatientPDF(
      codCita, patientId, patient.identipac, patient.fecha_atencion
    );

    this.emitRcvLog(jobId, 'info', `${logPrefix} Extrayendo datos RCV...`);
    const extractor = new RCVDataExtractor(pdfPath);
    const rcvData = await extractor.extract(patient.fecha_atencion);

    const previousPA = await getLastPA(patient.identipac);
    rcvData.presionArterialAnterior = previousPA;

    await savePatientVisit(patient.identipac, {
      fecha: patient.fecha_atencion,
      presionArterial: rcvData.presionArterial,
      labs: this.extractLabSummary(rcvData)
    });

    try {
      const reportingPeriod = deriveReportingPeriod(patient.fecha_atencion);
      const programa = patient.programa || 'riesgo-cardiovascular';
      const res202Record = mapToResolucion202(rcvData, programa, reportingPeriod);
      await databaseService.upsertPatientRecord(res202Record);
    } catch (dbError) {
      logger.warn('Failed to save to Supabase, continuing', {
        patient: patient.identipac, error: dbError.message
      });
    }

    logger.info(`${logPrefix} Paciente procesado exitosamente`, {
      identipac: patient.identipac
    });

    return {
      rowNumber: patient.rowNumber,
      identipac: patient.identipac,
      fecha: patient.fecha_atencion,
      patientId,
      codCita,
      pdfPath,
      rcvData,
      status: 'success'
    };
  }

  emitRcvProgress(jobId, progress) {
    if (!jobId) return;
    emitJobProgress(jobId, progress);
  }

  emitRcvLog(jobId, level, message, data = {}) {
    if (!jobId) return;
    emitLog(level, message, { ...data, jobId });
  }

  async recoverFromError() {
    try {
      const page = this.scraper.page;
      if (!page || page.isClosed()) {
        logger.warn('Page closed, reinitializing browser');
        await this.reinitializeScraper();
        return;
      }

      await page.goto(this.scraper.baseUrl + 'administrador/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      const menuVisible = await page.$('#menu2');
      if (!menuVisible) {
        logger.warn('Menu not found after recovery navigation, re-logging in');
        await this.reinitializeScraper();
        return;
      }

      logger.info('Recovery successful, menu is visible');
    } catch (navError) {
      logger.warn('Recovery navigation failed, reinitializing', { error: navError.message });
      await this.reinitializeScraper();
    }
  }

  async reinitializeScraper() {
    try {
      await this.scraper.close();
    } catch (_) {}
    await this.scraper.initialize();
    await this.scraper.login();
  }

  extractLabSummary(rcvData) {
    return {
      hdl: rcvData.hdl,
      ldl: rcvData.ldl,
      colesterolTotal: rcvData.colesterolTotal,
      trigliceridos: rcvData.trigliceridos,
      glucosa: rcvData.glucosa,
      creatinina: rcvData.creatinina,
      hba1c: rcvData.hba1c
    };
  }

  async sendEmail(to, zipPath, results, programa) {
    try {
      const summary = {
        total: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        programa: programa || 'RCV',
        fecha: this.today()
      };

      await sendReportEmail(to, zipPath, summary);
      logger.info('Email enviado', { to });
    } catch (error) {
      logger.error('Error enviando email (no bloquea el proceso)', {
        error: error.message
      });
    }
  }

  buildResponse(results, excelFilePath, zipFilePath, programa) {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return {
      success: successful > 0,
      excelFilePath,
      zipFilePath,
      programa: programa || 'RCV',
      summary: {
        total: results.length,
        successful,
        failed
      },
      results: results.map(r => ({
        identipac: r.identipac,
        fecha: r.fecha,
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
