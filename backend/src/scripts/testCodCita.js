import { RCBMonthlyScraper } from '../services/rcbMonthlyService.js';
import { logger } from '../utils/logger.js';

const identipac = process.argv[2] || '6238565';
const fecha = process.argv[3] || '2026-01-01';

async function test() {
  const scraper = new RCBMonthlyScraper();

  try {
    await scraper.initialize();
    await scraper.login();

    logger.info('Test: navigating to patient history');
    await scraper.navigateToPatientHistory();

    logger.info('Test: searching patient', { identipac });
    const patientId = await scraper.searchPatient(identipac);
    logger.info('Test: patient found', { patientId });

    logger.info('Test: extracting CodCita', { fecha });
    const codCita = await scraper.filterAndExtractCodCita(fecha);
    logger.info('Test: result', { codCita });
  } catch (error) {
    logger.error('Test failed', { error: error.message });
  } finally {
    await scraper.close();
  }
}

test();
