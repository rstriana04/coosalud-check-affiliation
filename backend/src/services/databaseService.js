import { createClient } from '@supabase/supabase-js';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import {
  getColumnNames,
  isNonDefaultValue,
  getDefaultForColumn,
} from '../utils/resolucion202Schema.js';

const TABLE_NAME = 'patient_records';

class DatabaseService {
  constructor() {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
    logger.info('Supabase client initialized', { url: config.supabase.url });
  }

  async upsertPatientRecord(record) {
    const row = buildRow(record);
    const { error } = await this.supabase
      .from(TABLE_NAME)
      .upsert(row, { onConflict: 'numero_identificacion,reporting_period,source_program' });

    if (error) {
      throw new Error(`Failed to upsert patient ${record.numero_identificacion}: ${error.message}`);
    }
  }

  async upsertBatch(records) {
    const rows = records.map(buildRow);
    const { error } = await this.supabase
      .from(TABLE_NAME)
      .upsert(rows, { onConflict: 'numero_identificacion,reporting_period,source_program' });

    if (error) {
      throw new Error(`Failed to upsert batch: ${error.message}`);
    }
    logger.info('Batch upsert completed', { count: records.length });
  }

  async getPatientsByPeriod(reportingPeriod) {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('reporting_period', reportingPeriod)
      .order('numero_identificacion');

    if (error) {
      throw new Error(`Failed to get patients for period ${reportingPeriod}: ${error.message}`);
    }
    return mergePatientRecords(data || []);
  }

  async getPatientsByProgram(reportingPeriod, program) {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('reporting_period', reportingPeriod)
      .eq('source_program', program)
      .order('id');

    if (error) {
      throw new Error(`Failed to get patients for ${program} in ${reportingPeriod}: ${error.message}`);
    }
    return data || [];
  }

  async deletePatientRecord(numeroIdentificacion, reportingPeriod) {
    const { error } = await this.supabase
      .from(TABLE_NAME)
      .delete()
      .eq('numero_identificacion', numeroIdentificacion)
      .eq('reporting_period', reportingPeriod);

    if (error) {
      throw new Error(`Failed to delete patient ${numeroIdentificacion}: ${error.message}`);
    }
  }

  async getReportingPeriods() {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select('reporting_period')
      .order('reporting_period', { ascending: false });

    if (error) {
      throw new Error(`Failed to get reporting periods: ${error.message}`);
    }
    const unique = [...new Set((data || []).map(r => r.reporting_period))];
    return unique;
  }

  async getPatientCount(reportingPeriod) {
    const { data, error } = await this.supabase
      .from(TABLE_NAME)
      .select('numero_identificacion')
      .eq('reporting_period', reportingPeriod);

    if (error) {
      throw new Error(`Failed to get patient count: ${error.message}`);
    }
    const unique = new Set((data || []).map(r => r.numero_identificacion));
    return unique.size;
  }
}

function buildRow(record) {
  const row = {
    reporting_period: record.reporting_period,
    source_program: record.source_program,
  };
  for (const col of getColumnNames()) {
    row[col] = record[col] !== undefined ? record[col] : getDefaultForColumn(col);
  }
  return row;
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
