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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class RCVReportService {
  constructor() {
    this.scraper = new RCBMonthlyScraper();
  }

  async generateFromExcel(inputExcelPath, options = {}) {
    const { email, limit } = options;
    let results = [];
    let excelFilePath = null;
    let zipFilePath = null;

    try {
      const { patients: allPatients, programa } = await readInputExcel(inputExcelPath);
      const patients = limit ? allPatients.slice(0, limit) : allPatients;

      logger.info('Iniciando generacion de informe RCV', {
        totalPatients: patients.length,
        originalTotal: allPatients.length,
        programa,
        email: email || 'none'
      });

      await this.scraper.initialize();
      await this.scraper.login();

      results = await this.processPatients(patients);

      const successfulData = results
        .filter(r => r.status === 'success')
        .map(r => r.rcvData);

      if (successfulData.length === 0) {
        logger.warn('Ningun paciente procesado exitosamente');
        return this.buildResponse(results, null, null, programa);
      }

      const outputDir = this.ensureOutputDir();
      const timestamp = this.timestamp();
      const filePrefix = programa || `${this.today()}-202-informe`;

      const excelPath = join(outputDir, `${filePrefix}-${timestamp}.xlsx`);
      excelFilePath = await generateRCVExcel(successfulData, excelPath, programa);

      const pdfFiles = results
        .filter(r => r.pdfPath)
        .map(r => r.pdfPath);

      const zipPath = join(outputDir, `${filePrefix}-${timestamp}.zip`);
      zipFilePath = await this.scraper.createZipArchive(
        pdfFiles, excelFilePath, zipPath
      );

      if (email && zipFilePath) {
        await this.sendEmail(email, zipFilePath, results, programa);
      }

      return this.buildResponse(results, excelFilePath, zipFilePath, programa);
    } catch (error) {
      logger.error('Error generando informe RCV', { error: error.message });
      throw error;
    } finally {
      await this.scraper.close();
    }
  }

  async processPatients(patients) {
    const results = [];
    const MAX_RETRIES = 3;

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const logPrefix = `[${i + 1}/${patients.length}]`;
      let lastError = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            logger.info(`${logPrefix} Reintento ${attempt}/${MAX_RETRIES}`, {
              identipac: patient.identipac
            });
            await this.scraper.page.waitForTimeout(2000 * attempt);
          } else {
            logger.info(`${logPrefix} Procesando paciente`, {
              identipac: patient.identipac,
              fecha: patient.fecha_atencion
            });
          }

          const result = await this.processOnePatient(patient, logPrefix);
          results.push(result);
          lastError = null;
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

      if (i < patients.length - 1) {
        await this.scraper.page.waitForTimeout(1000);
      }
    }

    return results;
  }

  async processOnePatient(patient, logPrefix) {
    await this.scraper.navigateToPatientHistory();
    const patientId = await this.scraper.searchPatient(patient.identipac);
    const codCita = await this.scraper.filterAndExtractCodCita(patient.fecha_atencion);

    if (!codCita) {
      throw new Error(`CodCita no encontrado para fecha ${patient.fecha_atencion}`);
    }

    const pdfPath = await this.scraper.downloadPatientPDF(
      codCita, patientId, patient.identipac, patient.fecha_atencion
    );

    const extractor = new RCVDataExtractor(pdfPath);
    const rcvData = await extractor.extract(patient.fecha_atencion);

    const previousPA = await getLastPA(patient.identipac);
    rcvData.presionArterialAnterior = previousPA;

    await savePatientVisit(patient.identipac, {
      fecha: patient.fecha_atencion,
      presionArterial: rcvData.presionArterial,
      labs: this.extractLabSummary(rcvData)
    });

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

  async recoverFromError() {
    try {
      const page = this.scraper.page;
      if (!page || page.isClosed()) {
        logger.warn('Page closed, reinitializing browser');
        await this.scraper.close();
        await this.scraper.initialize();
        await this.scraper.login();
        return;
      }

      await page.goto(this.scraper.baseUrl + 'administrador/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
    } catch (navError) {
      logger.warn('Recovery navigation failed, reinitializing', { error: navError.message });
      try {
        await this.scraper.close();
      } catch (_) {}
      await this.scraper.initialize();
      await this.scraper.login();
    }
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
