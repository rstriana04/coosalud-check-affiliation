import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { firefox } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import Captcha from '2captcha';

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
        headless: false,
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

      // Find the iframe - try common selectors
      const iframeElement = await this.page.waitForSelector('iframe[name="contenido"], iframe#contenido, iframe.iframe', { timeout: 10000 });
      
      if (!iframeElement) {
        // Log all iframes on the page for debugging
        const iframes = await this.page.$$('iframe');
        logger.debug('Found iframes', { count: iframes.length });
        
        for (let i = 0; i < iframes.length; i++) {
          const name = await iframes[i].getAttribute('name');
          const id = await iframes[i].getAttribute('id');
          const src = await iframes[i].getAttribute('src');
          logger.debug(`Iframe ${i}`, { name, id, src });
        }
        
        throw new Error('Could not find content iframe');
      }

      // Get the iframe's content frame
      const frame = await iframeElement.contentFrame();
      
      if (!frame) {
        throw new Error('Could not access iframe content');
      }

      logger.debug('Successfully accessed iframe content');

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

      // Get the iframe again for export button
      const iframeElement = await this.page.waitForSelector('iframe[name="contenido"], iframe#contenido, iframe.iframe', { timeout: 10000 });
      const frame = await iframeElement.contentFrame();
      
      if (!frame) {
        throw new Error('Could not access iframe content for download');
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

  async generateReport(startDate, endDate) {
    try {
      logger.info('Starting RCB Monthly report generation', { startDate, endDate });

      await this.initialize();
      await this.login();
      await this.navigateToReportSection();
      await this.setDateFilters(startDate, endDate);
      const filePath = await this.downloadReport();

      logger.info('RCB Monthly report generated successfully', { filePath });

      return filePath;
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

