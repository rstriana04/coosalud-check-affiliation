import { getAllValidationRules } from './resolucion202ValidationRules.js';
import { calculateAgeInYears } from './resolucion202ValidationHelpers.js';
import COLUMNS_202 from './resolucion202Columns.js';
import { logger } from './logger.js';

function getFieldName(fieldIndex) {
  const col = COLUMNS_202.find(c => c.index === fieldIndex);
  return col ? col.name : `campo_${fieldIndex}`;
}

function getFieldLabel(fieldIndex) {
  const col = COLUMNS_202.find(c => c.index === fieldIndex);
  return col ? col.label : `Campo ${fieldIndex}`;
}

function buildContext(reportingPeriodStart, reportingPeriodEnd, allRecords) {
  return { reportingPeriodStart, reportingPeriodEnd, allRecords };
}

function formatFieldValue(record, field) {
  if (Array.isArray(field)) {
    return field.map(f => String(record[f])).join(', ');
  }
  return String(record[field]);
}

function mapRuleError(rule, record) {
  const primaryField = Array.isArray(rule.field) ? rule.field[0] : rule.field;
  return {
    code: rule.code,
    field: rule.field,
    fieldName: getFieldName(primaryField),
    fieldLabel: getFieldLabel(primaryField),
    description: rule.description,
    value: formatFieldValue(record, rule.field),
    type: rule.type
  };
}

export class Resolucion202Validator {
  constructor(reportingPeriodStart, reportingPeriodEnd) {
    this.reportingPeriodStart = reportingPeriodStart;
    this.reportingPeriodEnd = reportingPeriodEnd;
    this.rules = getAllValidationRules();
    logger.info('Resolucion202Validator initialized', {
      ruleCount: this.rules.length,
      period: `${reportingPeriodStart} to ${reportingPeriodEnd}`
    });
  }

  validateRecord(record, rowIndex) {
    const context = buildContext(
      this.reportingPeriodStart,
      this.reportingPeriodEnd,
      []
    );
    const errors = this.runRulesAgainstRecord(record, context);
    return { row: rowIndex, errors };
  }

  runRulesAgainstRecord(record, context) {
    const errors = [];
    for (const rule of this.rules) {
      if (!this.isRuleApplicable(rule, record)) continue;
      try {
        const isValid = rule.validate(record, context);
        if (!isValid) errors.push(mapRuleError(rule, record));
      } catch (err) {
        logger.warn(`Rule ${rule.code} threw error`, { error: err.message });
      }
    }
    return errors;
  }

  isRuleApplicable(rule, record) {
    const field = Array.isArray(rule.field) ? rule.field[0] : rule.field;
    return record[field] !== undefined && record[field] !== null;
  }

  validateFile(records) {
    logger.info(`Validating ${records.length} records`);
    const context = buildContext(
      this.reportingPeriodStart,
      this.reportingPeriodEnd,
      records
    );

    const recordErrors = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    for (let i = 0; i < records.length; i++) {
      const errors = this.runRulesAgainstRecord(records[i], context);
      if (errors.length > 0) {
        recordErrors.push({ row: i + 1, errors });
        totalErrors += errors.filter(e => e.type === 'error').length;
        totalWarnings += errors.filter(e => e.type === 'warning').length;
      }
    }

    const summary = this.buildSummary(recordErrors);
    logger.info('Validation complete', { totalErrors, totalWarnings });

    return {
      valid: totalErrors === 0,
      totalRecords: records.length,
      totalErrors,
      totalWarnings,
      recordErrors,
      summary
    };
  }

  buildSummary(recordErrors) {
    const errorsByCode = {};
    const errorsByField = {};

    for (const { errors } of recordErrors) {
      for (const error of errors) {
        errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
        const fieldKey = error.fieldName;
        errorsByField[fieldKey] = (errorsByField[fieldKey] || 0) + 1;
      }
    }

    return { errorsByCode, errorsByField };
  }

  validateControlRecord(controlRecord) {
    const errors = [];

    if (Number(controlRecord[0]) !== 1) {
      errors.push(this.controlError('EC001', 'tipo_registro debe ser 1'));
    }

    if (!this.isValidPeriodFormat(controlRecord[1])) {
      errors.push(this.controlError('EC002', 'Periodo de reporte invalido'));
    }

    if (!controlRecord[2] || String(controlRecord[2]).trim() === '') {
      errors.push(this.controlError('EC003', 'Nombre IPS requerido'));
    }

    if (!/^\d{12}$/.test(String(controlRecord[3]))) {
      errors.push(this.controlError('EC004', 'Codigo habilitacion debe ser 12 digitos'));
    }

    if (!controlRecord[4] || isNaN(Number(controlRecord[4]))) {
      errors.push(this.controlError('EC005', 'Total registros debe ser numerico'));
    }

    return { row: 0, errors };
  }

  controlError(code, description) {
    return {
      code,
      field: 0,
      fieldName: 'control_record',
      fieldLabel: 'Registro de control',
      description,
      value: '',
      type: 'error'
    };
  }

  isValidPeriodFormat(value) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value));
  }
}
