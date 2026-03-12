import {
  buildAgeContext, mustBeSentinel, isSentinelDate, isSentinelResult
} from './resolucion202ValidationHelpers.js';
import { getAdultAgeRules } from './resolucion202AdultAgeRules.js';

function wasNeonateDuringPeriod(record, context) {
  const birthDate = new Date(String(record[9]));
  const periodStart = new Date(context.reportingPeriodStart);
  const neonatalEnd = new Date(birthDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  return neonatalEnd >= periodStart;
}

function buildNeonatalRules() {
  const numericFields = [37, 38, 48, 85];
  const dateFields = [65, 69, 75, 84];

  const rules = [];
  numericFields.forEach(fieldIdx => {
    rules.push({
      code: `E7N${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Campo ${fieldIdx} neonatal: debe ser 0/21 si no fue neonato en el periodo`,
      validate: (record, context) => {
        if (wasNeonateDuringPeriod(record, context)) return true;
        return isSentinelResult(record[fieldIdx]);
      }
    });
  });

  dateFields.forEach(fieldIdx => {
    rules.push({
      code: `E7N${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Campo ${fieldIdx} neonatal: debe ser fecha centinela si no fue neonato en el periodo`,
      validate: (record, context) => {
        if (wasNeonateDuringPeriod(record, context)) return true;
        return isSentinelDate(String(record[fieldIdx]));
      }
    });
  });

  return rules;
}

function buildPrimeraInfanciaRules() {
  const fields = [70, 71, 77];
  return fields.map(fieldIdx => ({
    code: `E7P${String(fieldIdx).padStart(3, '0')}`,
    type: 'error',
    field: fieldIdx,
    description: `Campo ${fieldIdx} primera infancia: debe ser 0 si edad >= 5 anios`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.months >= 6 && age.months <= 59) return true;
      return mustBeSentinel(record, fieldIdx, 0);
    }
  }));
}

function buildDevelopmentScaleRules() {
  const numericFields = [40, 43, 44, 45, 46];
  const dateField = 63;

  const rules = numericFields.map(fieldIdx => ({
    code: `E7D${String(fieldIdx).padStart(3, '0')}`,
    type: 'error',
    field: fieldIdx,
    description: `Campo ${fieldIdx} desarrollo: debe ser 0 si edad > 12 anios`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years <= 12) return true;
      return mustBeSentinel(record, fieldIdx, 0);
    }
  }));

  rules.push({
    code: `E7D${String(dateField).padStart(3, '0')}`,
    type: 'error',
    field: dateField,
    description: `Campo ${dateField} fecha VALE: debe ser 1845-01-01 si edad > 12 anios`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years <= 12) return true;
      return mustBeSentinel(record, dateField, '1845-01-01');
    }
  });

  return rules;
}

function buildVisualAcuityRules() {
  const fields = [27, 28];
  const dateField = 62;

  const rules = fields.map(fieldIdx => ({
    code: `E7V${String(fieldIdx).padStart(3, '0')}`,
    type: 'error',
    field: fieldIdx,
    description: `Campo ${fieldIdx} agudeza visual: debe ser 0 si edad < 3 anios`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years >= 3) return true;
      return mustBeSentinel(record, fieldIdx, 0);
    }
  }));

  rules.push({
    code: `E7V${String(dateField).padStart(3, '0')}`,
    type: 'error',
    field: dateField,
    description: `Campo ${dateField} fecha agudeza visual: debe ser 1845-01-01 si edad < 3`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years >= 3) return true;
      return mustBeSentinel(record, dateField, '1845-01-01');
    }
  });

  return rules;
}

function buildAnticoncepcionRules() {
  const dateFields = [53, 55];
  const numericField = 54;

  const rules = dateFields.map(fieldIdx => ({
    code: `E7A${String(fieldIdx).padStart(3, '0')}`,
    type: 'error',
    field: fieldIdx,
    description: `Campo ${fieldIdx} anticoncepcion: debe ser 1845-01-01 si edad < 10 o > 60`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years >= 10 && age.years <= 60) return true;
      return mustBeSentinel(record, fieldIdx, '1845-01-01');
    }
  }));

  rules.push({
    code: `E7A${String(numericField).padStart(3, '0')}`,
    type: 'error',
    field: numericField,
    description: `Campo ${numericField} anticoncepcion: debe ser 0 si edad < 10 o > 60`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years >= 10 && age.years <= 60) return true;
      return mustBeSentinel(record, numericField, 0);
    }
  });

  return rules;
}

export function getAgeRules() {
  return [
    ...buildNeonatalRules(),
    ...buildPrimeraInfanciaRules(),
    ...buildDevelopmentScaleRules(),
    ...buildVisualAcuityRules(),
    ...buildAnticoncepcionRules(),
    ...getAdultAgeRules()
  ];
}
