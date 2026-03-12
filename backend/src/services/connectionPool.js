import { firefox } from 'playwright';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class BrowserPool {
  constructor(maxSize = 2) {
    this.maxSize = maxSize;
    this.pool = [];
    this.activeConnections = 0;
  }

  async getBrowser() {
    if (this.pool.length > 0) {
      const browser = this.pool.pop();
      
      if (!browser.isConnected()) {
        logger.warn('Browser from pool is disconnected, creating new one');
        return this.getBrowser();
      }
      
      this.activeConnections++;
      logger.debug('Reusing browser from pool', { 
        poolSize: this.pool.length,
        active: this.activeConnections 
      });
      return browser;
    }

    if (this.activeConnections < this.maxSize) {
      const browser = await firefox.launch({
        headless: config.scraping.headlessMode
      });
      this.activeConnections++;
      logger.debug('Created new browser', { 
        active: this.activeConnections 
      });
      return browser;
    }

    await this.waitForAvailableBrowser();
    return this.getBrowser();
  }

  async releaseBrowser(browser) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(browser);
      this.activeConnections--;
      logger.debug('Browser returned to pool', { 
        poolSize: this.pool.length,
        active: this.activeConnections 
      });
    } else {
      await browser.close();
      this.activeConnections--;
      logger.debug('Browser closed (pool full)', { 
        active: this.activeConnections 
      });
    }
  }

  async waitForAvailableBrowser() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.pool.length > 0 || this.activeConnections < this.maxSize) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  async closeAll() {
    logger.info('Closing all browsers in pool');
    for (const browser of this.pool) {
      await browser.close();
    }
    this.pool = [];
    this.activeConnections = 0;
  }
}

export const browserPool = new BrowserPool(2);

