import { numValue, fieldValue } from './resolucion202ValidationHelpers.js';

function buildMaleSexRules() {
  const gestationalDates = [33, 49, 50, 51, 56, 58];
  const gestationalResults = [23, 35, 59, 60, 61];
  const cervixNumericFields = [86, 88, 89, 47];
  const cervixDateFields = [87, 91, 93, 94];
  const mammoNumericFields = [97, 101];
  const mammoDateFields = [96, 99, 100];

  const rules = [];

  rules.push({
    code: 'E6001',
    type: 'error',
    field: 14,
    description: 'Hombre: gestante debe ser 0',
    validate: (record) => {
      if (String(record[10]) !== 'M') return true;
      return numValue(record, 14) === 0;
    }
  });

  gestationalDates.forEach(fieldIdx => {
    rules.push({
      code: `E6D${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Hombre: campo ${fieldIdx} (fecha gestacional) debe ser 1845-01-01`,
      validate: (record) => {
        if (String(record[10]) !== 'M') return true;
        return String(record[fieldIdx]) === '1845-01-01';
      }
    });
  });

  gestationalResults.forEach(fieldIdx => {
    rules.push({
      code: `E6R${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Hombre: campo ${fieldIdx} (resultado gestacional) debe ser 0`,
      validate: (record) => {
        if (String(record[10]) !== 'M') return true;
        return numValue(record, fieldIdx) === 0;
      }
    });
  });

  cervixNumericFields.forEach(fieldIdx => {
    rules.push({
      code: `E6C${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Hombre: campo ${fieldIdx} (cervix) debe ser 0`,
      validate: (record) => {
        if (String(record[10]) !== 'M') return true;
        return numValue(record, fieldIdx) === 0;
      }
    });
  });

  cervixDateFields.forEach(fieldIdx => {
    rules.push({
      code: `E6C${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Hombre: campo ${fieldIdx} (fecha cervix) debe ser 1845-01-01`,
      validate: (record) => {
        if (String(record[10]) !== 'M') return true;
        return String(record[fieldIdx]) === '1845-01-01';
      }
    });
  });

  mammoNumericFields.forEach(fieldIdx => {
    rules.push({
      code: `E6M${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Hombre: campo ${fieldIdx} (mamografia) debe ser 0`,
      validate: (record) => {
        if (String(record[10]) !== 'M') return true;
        return numValue(record, fieldIdx) === 0;
      }
    });
  });

  mammoDateFields.forEach(fieldIdx => {
    rules.push({
      code: `E6M${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `Hombre: campo ${fieldIdx} (fecha mamografia) debe ser 1845-01-01`,
      validate: (record) => {
        if (String(record[10]) !== 'M') return true;
        return String(record[fieldIdx]) === '1845-01-01';
      }
    });
  });

  rules.push({
    code: 'E6H078',
    type: 'error',
    field: 78,
    description: 'Hombre: fecha hepatitis B gestacional debe ser 1845-01-01',
    validate: (record) => {
      if (String(record[10]) !== 'M') return true;
      return String(record[78]) === '1845-01-01';
    }
  });

  rules.push({
    code: 'E6H079',
    type: 'error',
    field: 79,
    description: 'Hombre: resultado hepatitis B gestacional debe ser 0',
    validate: (record) => {
      if (String(record[10]) !== 'M') return true;
      return numValue(record, 79) === 0;
    }
  });

  return rules;
}

function buildFemaleSexRules() {
  return [
    {
      code: 'E6F022',
      type: 'error',
      field: 22,
      description: 'Mujer: tacto rectal debe ser 0',
      validate: (record) => {
        if (String(record[10]) !== 'F') return true;
        return numValue(record, 22) === 0;
      }
    },
    {
      code: 'E6F064',
      type: 'error',
      field: 64,
      description: 'Mujer: fecha tacto rectal debe ser 1845-01-01',
      validate: (record) => {
        if (String(record[10]) !== 'F') return true;
        return String(record[64]) === '1845-01-01';
      }
    },
    {
      code: 'E6F073',
      type: 'error',
      field: 73,
      description: 'Mujer: fecha PSA debe ser 1845-01-01',
      validate: (record) => {
        if (String(record[10]) !== 'F') return true;
        return String(record[73]) === '1845-01-01';
      }
    },
    {
      code: 'E6F109',
      type: 'error',
      field: 109,
      description: 'Mujer: resultado PSA debe ser 0',
      validate: (record) => {
        if (String(record[10]) !== 'F') return true;
        return numValue(record, 109) === 0;
      }
    }
  ];
}

export function getSexRules() {
  return [...buildMaleSexRules(), ...buildFemaleSexRules()];
}
