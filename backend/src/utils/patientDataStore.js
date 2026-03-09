import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../../data');
const STORE_PATH = join(DATA_DIR, 'patients.json');
const MAX_HISTORY = 10;

let cache = null;

async function loadStore() {
  if (cache) return cache;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    cache = JSON.parse(raw);
  } catch {
    cache = {};
  }
  return cache;
}

async function persistStore() {
  if (!cache) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

export async function getPatient(identipac) {
  const store = await loadStore();
  return store[identipac] || null;
}

export async function getLastPA(identipac) {
  const patient = await getPatient(identipac);
  if (!patient?.history || patient.history.length === 0) return '';
  const lastVisit = patient.history[patient.history.length - 1];
  return lastVisit?.presionArterial || '';
}

export async function savePatientVisit(identipac, visitData) {
  const store = await loadStore();
  const existing = store[identipac] || { history: [] };

  existing.lastUpdate = new Date().toISOString();

  if (visitData.presionArterial) {
    existing.lastPA = visitData.presionArterial;
  }

  existing.history.push({
    fecha: visitData.fecha,
    presionArterial: visitData.presionArterial || '',
    labs: visitData.labs || {},
    timestamp: new Date().toISOString()
  });

  if (existing.history.length > MAX_HISTORY) {
    existing.history = existing.history.slice(-MAX_HISTORY);
  }

  store[identipac] = existing;
  cache = store;

  try {
    await persistStore();
  } catch (err) {
    logger.error('Error persistiendo datos de paciente', {
      identipac,
      error: err.message
    });
  }
}

export async function clearCache() {
  cache = null;
}
