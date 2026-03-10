const DB_NAME = 'AdresAutomationDB';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  async initialize() {
    if (this.db && !this.db.objectStoreNames) {
      console.warn('[IndexedDB] Database connection is invalid, reinitializing...');
      this.db = null;
    }

    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Error opening database:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        
        this.db.onclose = () => {
          console.warn('[IndexedDB] Database connection closed unexpectedly');
          this.db = null;
        };

        this.db.onerror = (event) => {
          console.error('[IndexedDB] Database error:', event.target.error);
        };

        console.log('[IndexedDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('jobId', 'jobId', { unique: false });
          console.log('[IndexedDB] Object store created');
        }
      };
    });

    return this.initPromise;
  }

  async saveJob(jobData, jobKey = 'current_job') {
    try {
      const db = await this.initialize();

      if (!db || !db.objectStoreNames) {
        throw new Error('Database connection is not available');
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);

          const data = {
            id: jobKey,
            ...jobData,
            timestamp: new Date().toISOString()
          };

          const request = store.put(data);

          request.onsuccess = () => {
            console.log('[IndexedDB] Job saved successfully');
            resolve(data);
          };

          request.onerror = () => {
            console.error('[IndexedDB] Error saving job:', request.error);
            reject(request.error);
          };

          transaction.onerror = () => {
            console.error('[IndexedDB] Transaction error:', transaction.error);
            reject(transaction.error);
          };

          transaction.onabort = () => {
            console.error('[IndexedDB] Transaction aborted');
            reject(new Error('Transaction was aborted'));
          };
        } catch (error) {
          console.error('[IndexedDB] Error creating transaction:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to save job:', error);
      throw error;
    }
  }

  async getJob(jobKey = 'current_job') {
    try {
      const db = await this.initialize();

      if (!db || !db.objectStoreNames) {
        throw new Error('Database connection is not available');
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(jobKey);

          request.onsuccess = () => {
            const job = request.result;
            
            if (job) {
              const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
              const jobTime = new Date(job.timestamp);
              
              if (jobTime < oneHourAgo) {
                console.log('[IndexedDB] Job expired, removing...');
                this.deleteJob();
                resolve(null);
              } else {
                console.log('[IndexedDB] Job retrieved successfully');
                resolve(job);
              }
            } else {
              console.log('[IndexedDB] No job found');
              resolve(null);
            }
          };

          request.onerror = () => {
            console.error('[IndexedDB] Error getting job:', request.error);
            reject(request.error);
          };
        } catch (error) {
          console.error('[IndexedDB] Error creating transaction:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to get job:', error);
      return null;
    }
  }

  async deleteJob(jobKey = 'current_job') {
    try {
      const db = await this.initialize();

      if (!db || !db.objectStoreNames) {
        console.warn('[IndexedDB] Database connection not available for deletion');
        return;
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(jobKey);

          request.onsuccess = () => {
            console.log('[IndexedDB] Job deleted successfully');
            resolve();
          };

          request.onerror = () => {
            console.error('[IndexedDB] Error deleting job:', request.error);
            reject(request.error);
          };
        } catch (error) {
          console.error('[IndexedDB] Error creating transaction:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to delete job:', error);
    }
  }

  async migrateFromLocalStorage() {
    try {
      const STORAGE_KEY = 'adres_current_job';
      const localData = localStorage.getItem(STORAGE_KEY);
      
      if (localData) {
        console.log('[IndexedDB] Migrating data from localStorage...');
        const jobData = JSON.parse(localData);
        await this.saveJob(jobData);
        localStorage.removeItem(STORAGE_KEY);
        console.log('[IndexedDB] Migration completed');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[IndexedDB] Migration failed:', error);
      return false;
    }
  }

  async getAllJobs() {
    try {
      await this.initialize();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          console.log('[IndexedDB] All jobs retrieved');
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('[IndexedDB] Error getting all jobs:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to get all jobs:', error);
      return [];
    }
  }

  async clear() {
    try {
      await this.initialize();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[IndexedDB] Database cleared');
          resolve();
        };

        request.onerror = () => {
          console.error('[IndexedDB] Error clearing database:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to clear database:', error);
    }
  }
}

export const db = new DatabaseService();

