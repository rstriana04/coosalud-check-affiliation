import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { logger } from '../utils/logger.js';
import {
  buildCreateTableSQL,
  buildUpsertSQL,
  getColumnNames,
  isNonDefaultValue,
  getDefaultForColumn,
} from '../utils/resolucion202Schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_DIR = join(__dirname, '../../data');
const DB_PATH = join(DB_DIR, 'resolucion202.db');

class DatabaseService {
  constructor() {
    mkdirSync(DB_DIR, { recursive: true });
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
    logger.info('SQLite database initialized', { path: DB_PATH });
  }

  initialize() {
    this.db.exec(buildCreateTableSQL());
    this.db.exec(buildIndexes());
  }

  upsertPatientRecord(record) {
    const params = buildParams(record);
    try {
      const stmt = this.db.prepare(buildUpsertSQL());
      return stmt.run(params);
    } catch (error) {
      throw new Error(`Failed to upsert patient ${record.numero_identificacion}: ${error.message}`);
    }
  }

  upsertBatch(records) {
    const stmt = this.db.prepare(buildUpsertSQL());
    const transaction = this.db.transaction((rows) => {
      for (const record of rows) {
        stmt.run(buildParams(record));
      }
    });
    try {
      transaction(records);
      logger.info('Batch upsert completed', { count: records.length });
    } catch (error) {
      throw new Error(`Failed to upsert batch: ${error.message}`);
    }
  }

  getPatientsByPeriod(reportingPeriod) {
    try {
      const rows = this.db
        .prepare('SELECT * FROM patient_records WHERE reporting_period = ? ORDER BY numero_identificacion')
        .all(reportingPeriod);
      return mergePatientRecords(rows);
    } catch (error) {
      throw new Error(`Failed to get patients for period ${reportingPeriod}: ${error.message}`);
    }
  }

  getPatientsByProgram(reportingPeriod, program) {
    try {
      return this.db
        .prepare('SELECT * FROM patient_records WHERE reporting_period = ? AND source_program = ? ORDER BY id')
        .all(reportingPeriod, program);
    } catch (error) {
      throw new Error(`Failed to get patients for ${program} in ${reportingPeriod}: ${error.message}`);
    }
  }

  deletePatientRecord(numeroIdentificacion, reportingPeriod) {
    try {
      return this.db
        .prepare('DELETE FROM patient_records WHERE numero_identificacion = ? AND reporting_period = ?')
        .run(numeroIdentificacion, reportingPeriod);
    } catch (error) {
      throw new Error(`Failed to delete patient ${numeroIdentificacion}: ${error.message}`);
    }
  }

  getReportingPeriods() {
    try {
      return this.db
        .prepare('SELECT DISTINCT reporting_period FROM patient_records ORDER BY reporting_period DESC')
        .all()
        .map(row => row.reporting_period);
    } catch (error) {
      throw new Error(`Failed to get reporting periods: ${error.message}`);
    }
  }

  getPatientCount(reportingPeriod) {
    try {
      const row = this.db
        .prepare('SELECT COUNT(DISTINCT numero_identificacion) as count FROM patient_records WHERE reporting_period = ?')
        .get(reportingPeriod);
      return row.count;
    } catch (error) {
      throw new Error(`Failed to get patient count: ${error.message}`);
    }
  }

  close() {
    this.db.close();
    logger.info('SQLite database connection closed');
  }
}

function buildParams(record) {
  const params = {
    reporting_period: record.reporting_period,
    source_program: record.source_program,
  };
  for (const col of getColumnNames()) {
    params[col] = record[col] !== undefined ? record[col] : getDefaultForColumn(col);
  }
  return params;
}

function buildIndexes() {
  return `
    CREATE INDEX IF NOT EXISTS idx_patient_period ON patient_records(reporting_period);
    CREATE INDEX IF NOT EXISTS idx_patient_program ON patient_records(source_program);
    CREATE INDEX IF NOT EXISTS idx_patient_identification ON patient_records(numero_identificacion);
  `;
}

function mergePatientRecords(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.numero_identificacion;
    if (!grouped.has(key)) {
      grouped.set(key, { ...row, source_program: collectPrograms(key, rows) });
      continue;
    }
    mergeIntoExisting(grouped.get(key), row);
  }
  return Array.from(grouped.values());
}

function collectPrograms(identificacion, rows) {
  return rows
    .filter(r => r.numero_identificacion === identificacion)
    .map(r => r.source_program)
    .join(',');
}

function mergeIntoExisting(target, source) {
  for (const col of getColumnNames()) {
    if (!isNonDefaultValue(col, target[col]) && isNonDefaultValue(col, source[col])) {
      target[col] = source[col];
    }
  }
}

export const databaseService = new DatabaseService();
