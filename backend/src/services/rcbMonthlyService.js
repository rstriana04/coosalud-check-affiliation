import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { firefox } from 'playwright';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import Captcha from '2captcha';
import { filterExcelByEspecialidad } from '../utils/excelFilterService.js';
import { extractPatientDataFromPDF } from '../utils/pdfProcessor.js';
import { generatePatientExcel } from '../utils/excelGenerator.js';
import { extractRCVDataFromPDF } from '../utils/medicalRecordExtractor.js';
import { generateRCVExcel } from '../utils/rcvExcelGenerator.js';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class RCBMonthlyScraper {
  constructor() {
    this.baseUrl = 'https://tusaludennuestrasmanos.macaw.com.co/';
    this.username = config.rcbMonthly.username;
    this.password = config.rcbMonthly.password;
    this.captchaSolver = new Captcha.Solver(config.rcbMonthly.captchaApiKey);
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async initialize() {
    try {
      logger.debug('Initializing RCB Monthly scraper');
      
      const downloadsDir = join(__dirname, '../../downloads');
      mkdirSync(downloadsDir, { recursive: true });
      
      logger.debug('Launching dedicated browser for RCB Monthly');
      this.browser = await firefox.launch({
        headless: true,
        args: []
      });

      this.context = await this.browser.newContext({
        acceptDownloads: true,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      });

      this.page = await this.context.newPage();
      
      logger.info('RCB Monthly scraper initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RCB Monthly scraper', { error: error.message });
      throw error;
    }
  }

  async solveCaptcha() {
    try {
      logger.debug('Solving reCAPTCHA...');
      
      await this.page.waitForTimeout(5000);
      
      logger.debug('Page loaded, searching for reCAPTCHA sitekey...');
      
      const sitekey = await this.page.evaluate(() => {
        const selectors = [
          '.g-recaptcha',
          '[data-sitekey]',
          'div[class*="recaptcha"]',
          'iframe[src*="recaptcha"]'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            const key = element.getAttribute('data-sitekey');
            if (key) return key;
            
            if (element.tagName === 'IFRAME') {
              const src = element.getAttribute('src');
              const match = src.match(/[?&]k=([^&]+)/);
              if (match) return match[1];
            }
          }
        }
        
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          const src = iframe.getAttribute('src') || '';
          if (src.includes('recaptcha')) {
            const match = src.match(/[?&]k=([^&]+)/);
            if (match) return match[1];
          }
        }
        
        return null;
      });

      logger.debug('Sitekey search result', { sitekey, type: typeof sitekey });

      if (!sitekey || sitekey === 'null' || sitekey === 'undefined') {
        logger.error('Could not find reCAPTCHA sitekey - page might not be fully loaded');
        
        const pageContent = await this.page.content();
        logger.debug('Page HTML length', { length: pageContent.length });
        logger.debug('Page contains recaptcha?', { hasRecaptcha: pageContent.includes('recaptcha') });
        
        throw new Error('Could not find reCAPTCHA sitekey');
      }

      logger.info('Found reCAPTCHA sitekey', { sitekey });

      const googlekey = String(sitekey).trim();
      logger.debug('Calling 2captcha with parameters', { 
        pageurl: this.baseUrl, 
        googlekey,
        googlekeyLength: googlekey.length 
      });

      const result = await this.captchaSolver.recaptcha(googlekey, this.baseUrl);

      logger.info('reCAPTCHA solved successfully', { captchaId: result.id });

      await this.page.evaluate((token) => {
        const textarea = document.querySelector('#g-recaptcha-response');
        if (textarea) {
          textarea.innerHTML = token;
          textarea.value = token;
        }
        
        if (typeof grecaptcha !== 'undefined' && grecaptcha.getResponse) {
          try {
            const widgetId = 0;
            grecaptcha.enterprise.execute(widgetId, {action: 'submit'});
          } catch (e) {
            console.log('Could not execute grecaptcha');
          }
        }
      }, result.data);

      return result.data;
    } catch (error) {
      logger.error('Error solving captcha', { error: error.message });
      throw error;
    }
  }

  async login() {
    try {
      logger.debug('Navigating to login page');
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });

      await this.page.waitForSelector('#txtusu', { timeout: 10000 });

      logger.debug('Filling login credentials');
      await this.page.fill('#txtusu', this.username);
      await this.page.fill('#txtcon', this.password);

      await this.solveCaptcha();

      await this.page.waitForTimeout(2000);

      logger.debug('Clicking login button');
      await this.page.click('.btn-login');

      await this.page.waitForNavigation({ 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      logger.info('Login successful');
    } catch (error) {
      logger.error('Login failed', { error: error.message });
      throw error;
    }
  }

  async navigateToReportSection() {
    try {
      logger.debug('Navigating to report section');

      logger.debug('Clicking first menu option');
      await this.page.waitForSelector('#menu2 > nav > div > ul > li:nth-child(6)', { timeout: 10000 });
      await this.page.click('#menu2 > nav > div > ul > li:nth-child(6)');
      await this.page.waitForTimeout(1500);

      logger.debug('Clicking second menu option');
      await this.page.waitForSelector('#menu2 > nav > div > ul > li.m-a-.contains-items.items-expanded > ul > li.sm-a-87.contains-items', { timeout: 10000 });
      await this.page.click('#menu2 > nav > div > ul > li.m-a-.contains-items.items-expanded > ul > li.sm-a-87.contains-items');
      await this.page.waitForTimeout(1500);

      logger.debug('Clicking third menu option');
      await this.page.waitForSelector('#menu2 > nav > div > ul > li.m-a-.contains-items.items-expanded > ul > li.sm-a-87.contains-items.items-expanded > ul > li.c-a-195 > a', { timeout: 10000 });
      await this.page.click('#menu2 > nav > div > ul > li.m-a-.contains-items.items-expanded > ul > li.sm-a-87.contains-items.items-expanded > ul > li.c-a-195 > a');
      await this.page.waitForTimeout(2000);

      logger.info('Successfully navigated to report section');
    } catch (error) {
      logger.error('Navigation failed', { error: error.message });
      throw error;
    }
  }

  async setDateFilters(startDate, endDate) {
    try {
      logger.debug('Setting date filters', { startDate, endDate });

      // Wait for iframe to load
      logger.debug('Waiting for iframe to load');
      await this.page.waitForTimeout(2000);

      // Get frame using page.frame() method (official Playwright approach)
      let frame = this.page.frame({ name: 'contenido' });
      
      if (!frame) {
        // Fallback: try by URL pattern
        frame = this.page.frame({ url: /reporteatencionesxmes\.php/ });
      }
      
      if (!frame) {
        const frames = this.page.frames();
        logger.error('Frame not found', { 
          availableFrames: frames.map(f => ({ name: f.name(), url: f.url() }))
        });
        throw new Error('Could not find content iframe');
      }

      logger.debug('Successfully accessed iframe content', { 
        frameName: frame.name(), 
        frameUrl: frame.url() 
      });

      // Now interact with elements inside the iframe
      await frame.waitForSelector('#txtfecini', { timeout: 10000 });
      await frame.fill('#txtfecini', startDate);
      logger.debug('Start date filled');

      await frame.waitForSelector('#txtfecfin', { timeout: 10000 });
      await frame.fill('#txtfecfin', endDate);
      logger.debug('End date filled');

      logger.debug('Clicking filter button');
      
      // Wait for the filter button to be in the DOM (correct ID is #filtrar, not #filter)
      await frame.waitForSelector('#filtrar', { state: 'attached', timeout: 10000 });
      logger.debug('Filter button found in DOM');
      
      // Try to scroll the button into view and click it
      try {
        // First attempt: scroll into view and click
        await frame.evaluate(() => {
          const filterButton = document.querySelector('#filtrar');
          if (filterButton) {
            filterButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        
        await this.page.waitForTimeout(1000); // Wait for scroll animation
        
        // Try regular click first
        await frame.click('#filtrar', { timeout: 5000 });
        logger.debug('Filter button clicked successfully');
      } catch (clickError) {
        logger.warn('Regular click failed, trying JavaScript click', { error: clickError.message });
        
        // Fallback: use JavaScript click (works even if element is not visible)
        await frame.evaluate(() => {
          const filterButton = document.querySelector('#filtrar');
          if (filterButton) {
            filterButton.click();
          } else {
            throw new Error('Filter button not found in DOM');
          }
        });
        
        logger.debug('Filter button clicked via JavaScript');
      }

      await this.page.waitForTimeout(3000);

      logger.info('Date filters applied successfully');
    } catch (error) {
      logger.error('Failed to set date filters', { error: error.message });
      throw error;
    }
  }

  async downloadReport() {
    try {
      logger.debug('Downloading report');

      const downloadsDir = join(__dirname, '../../downloads');
      const downloadPath = join(downloadsDir, `rcb-monthly-${Date.now()}.xls`);

      // Get frame using page.frame() method
      await this.page.waitForTimeout(1000);
      
      let frame = this.page.frame({ name: 'contenido' });
      
      if (!frame) {
        frame = this.page.frame({ url: /reporteatencionesxmes\.php/ });
      }
      
      if (!frame) {
        const frames = this.page.frames();
        logger.error('Frame not found for download', { 
          availableFrames: frames.map(f => ({ name: f.name(), url: f.url() }))
        });
        throw new Error('Could not find iframe for download');
      }

      logger.debug('Waiting for export button in iframe');
      const exportButtonSelector = '#form1 > table > tbody > tr:nth-child(1) > td > table > tbody > tr:nth-child(1) > td:nth-child(7) > ul > li > a';
      await frame.waitForSelector(exportButtonSelector, { state: 'attached', timeout: 10000 });
      logger.debug('Export button found in DOM');

      // Scroll export button into view
      await frame.evaluate((selector) => {
        const exportButton = document.querySelector(selector);
        if (exportButton) {
          exportButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, exportButtonSelector);
      
      await this.page.waitForTimeout(1000); // Wait for scroll

      let download;
      try {
        // Try regular click first
        [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 30000 }),
          frame.click(exportButtonSelector, { timeout: 5000 })
        ]);
        logger.debug('Export button clicked successfully');
      } catch (clickError) {
        logger.warn('Regular click on export button failed, trying JavaScript click', { error: clickError.message });
        
        // Fallback: JavaScript click
        [download] = await Promise.all([
          this.page.waitForEvent('download', { timeout: 30000 }),
          frame.evaluate((selector) => {
            const exportButton = document.querySelector(selector);
            if (exportButton) {
              exportButton.click();
            } else {
              throw new Error('Export button not found in DOM');
            }
          }, exportButtonSelector)
        ]);
        
        logger.debug('Export button clicked via JavaScript');
      }

      await download.saveAs(downloadPath);

      logger.info('Report downloaded successfully', { downloadPath });

      return downloadPath;
    } catch (error) {
      logger.error('Failed to download report', { error: error.message });
      throw error;
    }
  }

  async navigateToPatientHistory() {
    try {
      logger.debug('Navigating to patient history section');

      await this.page.click('#menu2 > nav > div > ul > li:nth-child(6)');
      await this.page.waitForTimeout(1000);

      await this.page.click('#menu2 > nav > div > ul > li.m-a-.contains-items.items-expanded > ul > li.sm-a-86 > a');
      await this.page.waitForTimeout(2000);

      logger.info('Successfully navigated to patient history section');
    } catch (error) {
      logger.error('Failed to navigate to patient history', { error: error.message });
      throw error;
    }
  }

  async searchPatient(documentNumber) {
    try {
      logger.debug('Searching for patient', { documentNumber });

      await this.page.waitForTimeout(2000);

      // Get frame using page.frame() method
      let frame = this.page.frame({ name: 'contenido' });
      
      if (!frame) {
        frame = this.page.frame({ url: /consultahistoriaclinica\.php/ });
      }

      if (!frame) {
        const frames = this.page.frames();
        logger.error('Frame not found', { 
          availableFrames: frames.map(f => ({ name: f.name(), url: f.url() }))
        });
        throw new Error('Could not find iframe for patient search');
      }

      logger.debug('Found frame', { frameName: frame.name(), frameUrl: frame.url() });

      await frame.waitForSelector('#txt1pacienteno', { timeout: 10000 });
      
      await frame.fill('#txt1pacienteno', '');
      await this.page.waitForTimeout(500);

      await frame.type('#txt1pacienteno', String(documentNumber), { delay: 100 });
      
      logger.debug('Waiting for autocomplete dropdown to appear');
      await this.page.waitForTimeout(2000);

      const autocompleteClicked = await frame.evaluate((docNumber) => {
        const autocompleteSelectors = [
          '.ui-autocomplete',
          '.ui-menu',
          'ul.ui-autocomplete',
          '[role="listbox"]',
          '.autocomplete-suggestions'
        ];

        for (const selector of autocompleteSelectors) {
          const autocompleteList = document.querySelector(selector);
          if (autocompleteList && autocompleteList.style.display !== 'none') {
            const items = autocompleteList.querySelectorAll('li, .ui-menu-item, [role="option"]');
            
            for (const item of items) {
              const itemText = item.textContent || item.innerText;
              if (itemText.includes(docNumber)) {
                item.click();
                console.log('Clicked autocomplete item:', itemText);
                return true;
              }
            }
          }
        }
        
        return false;
      }, String(documentNumber));

      if (autocompleteClicked) {
        logger.info('Autocomplete item clicked successfully');
        await this.page.waitForTimeout(1500);
      } else {
        logger.warn('Autocomplete item not found, trying keyboard selection');
        
        await frame.press('#txt1pacienteno', 'ArrowDown');
        await this.page.waitForTimeout(300);
        await frame.press('#txt1pacienteno', 'Enter');
        await this.page.waitForTimeout(1500);
      }

      const patientId = await frame.evaluate(() => {
        const hiddenInput = document.querySelector('#hid2codpacientesi');
        return hiddenInput ? hiddenInput.value : null;
      });

      if (!patientId) {
        throw new Error(`Patient ID not populated after autocomplete selection for document: ${documentNumber}`);
      }

      logger.info('Patient selected from autocomplete', { documentNumber, patientId });

      return patientId;
    } catch (error) {
      logger.error('Failed to search patient', { documentNumber, error: error.message });
      throw error;
    }
  }

  async fillPatientId(patientId) {
    try {
      logger.debug('Filling patient ID', { patientId });

      const iframeElement = await this.page.waitForSelector('iframe[name="contenido"], iframe#contenido, iframe.iframe', { timeout: 10000 });
      const frame = await iframeElement.contentFrame();

      if (!frame) {
        throw new Error('Could not access iframe content for filling patient ID');
      }

      await frame.evaluate((id) => {
        const input = document.querySelector('#hid2codpacientesi');
        if (input) {
          input.value = id;
          input.setAttribute('value', id);
        } else {
          throw new Error('Patient ID input not found');
        }
      }, String(patientId));

      await this.page.waitForTimeout(500);

      const verifyValue = await frame.evaluate(() => {
        const input = document.querySelector('#hid2codpacientesi');
        return input ? {
          value: input.value,
          attribute: input.getAttribute('value')
        } : null;
      });

      logger.debug('Patient ID filled and verified', { 
        patientId, 
        verifyValue 
      });
    } catch (error) {
      logger.error('Failed to fill patient ID', { patientId, error: error.message });
      throw error;
    }
  }

  async filterAndExtractCodCita(fechaAtencion) {
    try {
      logger.debug('Filtering and extracting CodCita', { fechaAtencion });

      await this.page.waitForTimeout(1000);

      // Get frame using page.frame() method
      let frame = this.page.frame({ name: 'contenido' });
      
      if (!frame) {
        frame = this.page.frame({ url: /consultahistoriaclinica\.php/ });
      }

      if (!frame) {
        const frames = this.page.frames();
        logger.error('Frame not found for filtering', { 
          availableFrames: frames.map(f => ({ name: f.name(), url: f.url() }))
        });
        throw new Error('Could not find iframe for filtering');
      }

      await frame.waitForSelector('#filtrar', { state: 'attached', timeout: 10000 });

      try {
        await frame.evaluate(() => {
          const filterButton = document.querySelector('#filtrar');
          if (filterButton) {
            filterButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });

        await this.page.waitForTimeout(1000);
        await frame.click('#filtrar', { timeout: 5000 });
      } catch (clickError) {
        await frame.evaluate(() => {
          const filterButton = document.querySelector('#filtrar');
          if (filterButton) {
            filterButton.click();
          }
        });
      }

      await this.page.waitForTimeout(3000);

      const result = await frame.evaluate((targetDate) => {
        function extractDateParts(text) {
          const isoMatch = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          if (isoMatch) return { y: isoMatch[1], m: isoMatch[2].padStart(2, '0'), d: isoMatch[3].padStart(2, '0') };

          const dmyMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
          if (dmyMatch) return { y: dmyMatch[3], m: dmyMatch[2].padStart(2, '0'), d: dmyMatch[1].padStart(2, '0') };

          return null;
        }

        const targetParts = extractDateParts(targetDate);
        if (!targetParts) return { codCita: null, debug: { error: 'Could not parse targetDate', targetDate } };

        const tbody = document.querySelector('#form1 > table > tbody > tr:nth-child(4) > td:nth-child(2) > table > tbody');

        if (!tbody) {
          const allTbodies = document.querySelectorAll('tbody');
          const tables = document.querySelectorAll('table');
          return {
            codCita: null,
            debug: {
              error: 'Tbody not found with primary selector',
              totalTables: tables.length,
              totalTbodies: allTbodies.length,
              bodySnippet: document.body?.innerHTML?.substring(0, 500) || 'empty'
            }
          };
        }

        const rows = tbody.querySelectorAll('tr');
        const sampleCells = [];

        for (let i = 0; i < rows.length && i < 5; i++) {
          const cells = rows[i].querySelectorAll('td');
          const rowTexts = [];
          for (let j = 0; j < cells.length; j++) {
            rowTexts.push(cells[j].textContent.trim());
          }
          sampleCells.push(rowTexts);
        }

        for (let i = 0; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length === 0) continue;

          for (let j = 0; j < cells.length; j++) {
            const cellText = cells[j].textContent.trim();
            const cellParts = extractDateParts(cellText);

            if (cellParts && cellParts.y === targetParts.y && cellParts.m === targetParts.m && cellParts.d === targetParts.d) {
              const codCita = cells[0]?.textContent.trim() || null;
              return { codCita, debug: { matched: true, cellText, row: i, col: j } };
            }
          }
        }

        return {
          codCita: null,
          debug: {
            error: 'No matching date found',
            targetDate,
            targetParts,
            totalRows: rows.length,
            sampleCells
          }
        };
      }, fechaAtencion);

      if (result.debug) {
        logger.debug('filterAndExtractCodCita debug', result.debug);
      }

      const codCita = result.codCita;

      if (!codCita) {
        try {
          const screenshotDir = join(__dirname, '../../logs');
          mkdirSync(screenshotDir, { recursive: true });
          const ssPath = join(screenshotDir, `codcita-debug-${Date.now()}.png`);
          await this.page.screenshot({ path: ssPath, fullPage: true });
          logger.warn('CodCita not found - screenshot saved', { fechaAtencion, ssPath });
        } catch (ssErr) {
          logger.warn('CodCita not found (screenshot failed)', { fechaAtencion });
        }
        return null;
      }

      logger.info('CodCita extracted successfully', { fechaAtencion, codCita });
      return codCita;
    } catch (error) {
      logger.error('Failed to extract CodCita', { fechaAtencion, error: error.message });
      throw error;
    }
  }

  async downloadPatientPDF(codCita, patientId, documentNumber, fechaAtencion) {
    try {
      const pdfUrl = `https://tusaludennuestrasmanos.macaw.com.co/administrador/componentes/ajax_php/imprime/imprimePaginaHistoria_convert.php?codcita=${codCita}&codpaciente=${patientId}`;
      
      logger.info('Downloading patient PDF', { 
        codCita, 
        patientId, 
        documentNumber,
        pdfUrl 
      });
      
      console.log(`\n📥 Downloading PDF for patient ${documentNumber}`);
      console.log(`   URL: ${pdfUrl}`);

      const pdfDir = join(__dirname, '../../pdfs');
      mkdirSync(pdfDir, { recursive: true });

      const fechaFormatted = fechaAtencion.replace(/-/g, '');
      const pdfFileName = `CC_${documentNumber}_HISTORIA CLINICA_${fechaFormatted}.pdf`;
      const pdfPath = join(pdfDir, pdfFileName);

      const downloadPromise = this.page.waitForEvent('download', { timeout: 60000 });

      await this.page.evaluate((url) => {
        window.open(url, '_blank');
      }, pdfUrl);

      const download = await downloadPromise;

      await download.saveAs(pdfPath);

      logger.info('PDF downloaded successfully', { pdfPath, documentNumber });
      console.log(`   ✅ Saved to: ${pdfPath}\n`);

      return pdfPath;
    } catch (error) {
      logger.error('Failed to download patient PDF', { 
        codCita, 
        patientId, 
        documentNumber,
        error: error.message 
      });
      throw error;
    }
  }

  async createZipArchive(pdfFiles, excelFile, outputPath, additionalFiles = []) {
    try {
      logger.info('Creating ZIP archive', { 
        pdfCount: pdfFiles.length,
        excelFile,
        outputPath 
      });

      return new Promise((resolve, reject) => {
        const output = createWriteStream(outputPath);
        const archive = archiver('zip', {
          zlib: { level: 9 }
        });

        output.on('close', () => {
          logger.info('ZIP archive created successfully', { 
            outputPath,
            totalBytes: archive.pointer()
          });
          resolve(outputPath);
        });

        archive.on('error', (err) => {
          logger.error('Error creating ZIP archive', { error: err.message });
          reject(err);
        });

        archive.pipe(output);

        pdfFiles.forEach(pdfPath => {
          const fileName = basename(pdfPath);
          archive.file(pdfPath, { name: fileName });
        });

        if (excelFile) {
          const excelFileName = basename(excelFile);
          archive.file(excelFile, { name: excelFileName });
        }

        // Add additional files (e.g., RCV Excel)
        additionalFiles.forEach(filePath => {
          if (filePath) {
            const fileName = basename(filePath);
            archive.file(filePath, { name: fileName });
          }
        });

        archive.finalize();
      });
    } catch (error) {
      logger.error('Failed to create ZIP archive', { error: error.message });
      throw error;
    }
  }

  async processPatientRecords(filteredData) {
    try {
      logger.info('Starting patient records processing', { totalRecords: filteredData.length - 1 });

      const results = [];
      const pdfFiles = [];
      const patientDataArray = [];
      const rcvDataArray = [];
      const dataRows = filteredData.slice(1);

      for (let i = 0; i < dataRows.length; i++) {
        const record = dataRows[i];
        const documentNumber = record.B;
        const fechaAtencion = record.G;

        logger.info(`Processing record ${i + 1}/${dataRows.length}`, { documentNumber, fechaAtencion });

        try {
          await this.navigateToPatientHistory();

          const patientId = await this.searchPatient(documentNumber);

          const codCita = await this.filterAndExtractCodCita(fechaAtencion);

          if (!codCita) {
            throw new Error('CodCita not found');
          }

          const pdfPath = await this.downloadPatientPDF(codCita, patientId, documentNumber, fechaAtencion);
          pdfFiles.push(pdfPath);

          // Extract basic patient data (for backward compatibility)
          const patientData = await extractPatientDataFromPDF(pdfPath);
          patientDataArray.push(patientData);

          // Extract RCV format data (with LLM support if configured)
          const rcvData = await extractRCVDataFromPDF(pdfPath, fechaAtencion);
          rcvDataArray.push(rcvData);

          results.push({
            rowNumber: record._rowNumber,
            documentNumber,
            fechaAtencion,
            patientId,
            codCita,
            pdfPath,
            status: 'success'
          });

          logger.info(`Record processed successfully`, { documentNumber, codCita });
        } catch (error) {
          logger.error(`Failed to process record`, { documentNumber, error: error.message });
          
          results.push({
            rowNumber: record._rowNumber,
            documentNumber,
            fechaAtencion,
            patientId: null,
            codCita: null,
            pdfPath: null,
            status: 'failed',
            error: error.message
          });
        }

        await this.page.waitForTimeout(1000);
      }

      logger.info('Patient records processing completed', { 
        total: dataRows.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
      });

      const processedDir = join(__dirname, '../../processed');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Generate basic patient Excel (backward compatibility)
      const excelFileName = `pacientes-${timestamp}.xlsx`;
      const excelPath = join(processedDir, excelFileName);
      let excelFilePath = null;
      if (patientDataArray.length > 0) {
        excelFilePath = await generatePatientExcel(patientDataArray, excelPath);
        logger.info('Excel file generated', { excelFilePath, patientCount: patientDataArray.length });
      }

      // Generate RCV format Excel
      const rcvExcelFileName = `rcv-format-${timestamp}.xlsx`;
      const rcvExcelPath = join(processedDir, rcvExcelFileName);
      let rcvExcelFilePath = null;
      if (rcvDataArray.length > 0) {
        rcvExcelFilePath = await generateRCVExcel(rcvDataArray, rcvExcelPath);
        logger.info('RCV Excel file generated', { rcvExcelFilePath, recordCount: rcvDataArray.length });
      }

      const zipFileName = `historias-clinicas-${timestamp}.zip`;
      const zipPath = join(processedDir, zipFileName);
      // Include both Excel files in ZIP
      const additionalFiles = [];
      if (rcvExcelFilePath && excelFilePath) {
        additionalFiles.push(excelFilePath); // Include basic Excel if RCV exists
      }
      const zipFilePath = await this.createZipArchive(
        pdfFiles, 
        rcvExcelFilePath || excelFilePath, 
        zipPath,
        additionalFiles
      );

      return {
        results,
        excelFilePath,
        rcvExcelFilePath,
        zipFilePath,
        pdfFiles,
        processingResults: results
      };
    } catch (error) {
      logger.error('Failed to process patient records', { error: error.message });
      throw error;
    }
  }

  async generateReport(startDate, endDate) {
    try {
      logger.info('Starting RCB Monthly report generation', { startDate, endDate });

      await this.initialize();
      await this.login();
      await this.navigateToReportSection();
      await this.setDateFilters(startDate, endDate);
      const excelFilePath = await this.downloadReport();

      logger.info('RCB Monthly report downloaded successfully', { excelFilePath });

      const processedDir = join(__dirname, '../../processed');
      mkdirSync(processedDir, { recursive: true });

      logger.info('Filtering Excel data by especialidad and diagnostico');
      const filterResult = await filterExcelByEspecialidad(excelFilePath, processedDir);

      logger.info('RCB Monthly report generated and filtered successfully', { 
        excelFilePath,
        jsonFilePath: filterResult.jsonPath,
        totalFilteredRows: filterResult.totalRows
      });

      logger.info('Starting patient records processing workflow');
      const processingResults = await this.processPatientRecords(filterResult.filteredData);

      return {
        excelFilePath,
        jsonFilePath: filterResult.jsonPath,
        totalRows: filterResult.totalRows,
        filteredData: filterResult.filteredData,
        processingResults: processingResults.results,
        patientExcelFile: processingResults.excelFilePath,
        zipFilePath: processingResults.zipFilePath,
        pdfFiles: processingResults.pdfFiles
      };
    } catch (error) {
      logger.error('Failed to generate RCB Monthly report', { error: error.message });
      throw error;
    } finally {
      await this.close();
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
        await this.browser.close();
        logger.debug('Browser closed');
      }
    } catch (error) {
      logger.error('Error closing browser', { error: error.message });
    }
  }
}

