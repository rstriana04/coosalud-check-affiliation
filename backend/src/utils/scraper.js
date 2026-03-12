import { config } from '../config/config.js';
import { logger } from './logger.js';
import { browserPool } from '../services/connectionPool.js';
import { PDFProcessor } from './pdfProcessor.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class CoosaludScraper {
  constructor() {
    this.baseUrl = 'https://portal.coosalud.com/AffiliateManager/GetCertificate';
    this.maxRetries = config.processing.maxRetries;
    this.retryDelayMs = config.scraping.minDelayMs;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async initialize() {
    try {
      logger.debug('Initializing PDF downloader with browser pool');
      
      const downloadsDir = join(__dirname, '../../downloads');
      mkdirSync(downloadsDir, { recursive: true });
      
      this.browser = await browserPool.getBrowser();

      this.context = await this.browser.newContext({
        acceptDownloads: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
      });

      this.page = await this.context.newPage();
      
      logger.info('PDF downloader initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PDF downloader', { error: error.message });
      throw error;
    }
  }

  async queryAffiliationDate(tipoDocumento, numeroDocumento) {
    try {
      logger.debug('Querying affiliation date', { tipoDocumento, numeroDocumento });

      const pdfPath = await this.downloadPdfWithRetry(tipoDocumento, numeroDocumento);

      const fechaAfiliacion = await this.extractDateFromPdf(pdfPath);

      logger.info('Affiliation date extracted', { 
        tipoDocumento, 
        numeroDocumento, 
        fechaAfiliacion 
      });

      return { fechaAfiliacion, pdfPath };
    } catch (error) {
      logger.error('Error querying affiliation date', { 
        tipoDocumento, 
        numeroDocumento, 
        error: error.message 
      });
      throw error;
    }
  }

  async downloadPdfWithRetry(tipoDocumento, numeroDocumento) {
    const downloadsDir = join(__dirname, '../../downloads');
    const pdfFileName = `certificado_${numeroDocumento}_${Date.now()}.pdf`;
    const pdfPath = join(downloadsDir, pdfFileName);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Downloading PDF (attempt ${attempt}/${this.maxRetries})`, {
          tipoDocumento,
          numeroDocumento
        });

        const url = `${this.baseUrl}?DocumentType=${tipoDocumento}&DocumentNumber=${numeroDocumento}`;
        
        logger.debug('Navigating to PDF URL', { url });
        
        const [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 30000 }),
          this.page.goto(url, { 
            waitUntil: 'load',
            timeout: 30000 
          })
        ]);

        logger.debug('Download event captured, saving file...');
        await download.saveAs(pdfPath);

        const fs = await import('fs/promises');
        const stat = await fs.stat(pdfPath);
        
        logger.info('PDF downloaded successfully', { 
          pdfPath, 
          size: stat.size,
          attempt 
        });

        return pdfPath;

      } catch (error) {
        logger.warn(`Download attempt ${attempt} failed`, {
          tipoDocumento,
          numeroDocumento,
          error: error.message,
          attempt
        });

        if (attempt === this.maxRetries) {
          logger.error('All download attempts failed', {
            tipoDocumento,
            numeroDocumento,
            attempts: this.maxRetries
          });
          throw new Error(`Failed to download PDF after ${this.maxRetries} attempts: ${error.message}`);
        }

        logger.debug(`Waiting ${this.retryDelayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
      }
    }
  }

  async extractDateFromPdf(pdfPath) {
    try {
      logger.debug('Extracting date from PDF...', { pdfPath });

      const processor = new PDFProcessor(pdfPath);
      const text = await processor.extractText();

      logger.debug('PDF text extracted', {
        textLength: text.length,
        preview: text.substring(0, 200)
      });
      
      const fechaRegex = /Fecha\s+de\s+afiliaci[oó]n:\s*(\d{4}-\d{2}-\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4})/i;
      const match = text.match(fechaRegex);
      
      if (match && match[1]) {
        logger.info('Affiliation date found in PDF', { date: match[1] });
        return match[1];
      }
      
      const altFechaRegex = /(\d{4}-\d{2}-\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4})/g;
      const dates = text.match(altFechaRegex);
      
      if (dates && dates.length > 0) {
        logger.warn('Using first date found in PDF', { date: dates[0] });
        return dates[0];
      }
      
      throw new Error('Could not find affiliation date in PDF');
    } catch (error) {
      logger.error('Error extracting date from PDF', { error: error.message });
      throw error;
    }
  }

  async close() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
        logger.debug('Page closed');
      }
      
      if (this.context) {
        await this.context.close();
        logger.debug('Context closed');
      }
      
      if (this.browser) {
        await browserPool.releaseBrowser(this.browser);
        logger.debug('Browser returned to pool');
      }
    } catch (error) {
      logger.error('Error closing browser', { error: error.message });
    }
  }

  async randomDelay() {
    const delay = Math.floor(
      Math.random() * (config.scraping.maxDelayMs - config.scraping.minDelayMs) + 
      config.scraping.minDelayMs
    );
    
    logger.debug(`Random delay: ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
