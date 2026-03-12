import { numValue, isRealDate, isSentinelDate } from './resolucion202ValidationHelpers.js';

function buildGestanteActiveRules() {
  return [
    {
      code: 'E9G023',
      type: 'error',
      field: 23,
      description: 'Gestante activa: acido folico preconcepcional no debe ser 0',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        return numValue(record, 23) !== 0;
      }
    },
    {
      code: 'E9G033',
      type: 'error',
      field: 33,
      description: 'Gestante activa: fecha probable parto debe ser fecha real',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        return isRealDate(String(record[33]));
      }
    },
    {
      code: 'E9G035',
      type: 'error',
      field: 35,
      description: 'Gestante activa: clasificacion riesgo debe ser 4 o 5',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        const val = numValue(record, 35);
        return val === 4 || val === 5;
      }
    },
    {
      code: 'E9G056',
      type: 'error',
      field: 56,
      description: 'Gestante activa: fecha primera consulta prenatal debe ser fecha real',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        return isRealDate(String(record[56]));
      }
    },
    {
      code: 'E9G078',
      type: 'warning',
      field: 78,
      description: 'Gestante activa: fecha hepatitis B deberia ser fecha real (sin dato detectado)',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        const dateVal = String(record[78]);
        return isRealDate(dateVal) || isSentinelDate(dateVal);
      }
    },
    {
      code: 'E9G079',
      type: 'warning',
      field: 79,
      description: 'Gestante activa: resultado hepatitis B deberia tener resultado real',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        const val = numValue(record, 79);
        return val !== 0 && val !== 998;
      }
    },
    {
      code: 'E9G080',
      type: 'warning',
      field: 80,
      description: 'Gestante activa: fecha sifilis deberia ser fecha real (sin dato detectado)',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        const dateVal = String(record[80]);
        return isRealDate(dateVal) || isSentinelDate(dateVal);
      }
    },
    {
      code: 'E9G081',
      type: 'warning',
      field: 81,
      description: 'Gestante activa: resultado sifilis deberia tener resultado real',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        const val = numValue(record, 81);
        return val !== 0 && val !== 998;
      }
    },
    {
      code: 'E9G082',
      type: 'warning',
      field: 82,
      description: 'Gestante activa: fecha VIH deberia ser fecha real (sin dato detectado)',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        const dateVal = String(record[82]);
        return isRealDate(dateVal) || isSentinelDate(dateVal);
      }
    },
    {
      code: 'E9G083',
      type: 'warning',
      field: 83,
      description: 'Gestante activa: resultado VIH deberia tener resultado real',
      validate: (record) => {
        if (numValue(record, 14) !== 1) return true;
        const val = numValue(record, 83);
        return val !== 0 && val !== 998;
      }
    }
  ];
}

function buildGestanteInactiveRules() {
  const sentinelDateFields = [33, 56, 58];
  const zeroFields = [59, 60, 61];

  const rules = [];

  sentinelDateFields.forEach(fieldIdx => {
    rules.push({
      code: `E9I${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `No gestante: campo ${fieldIdx} debe ser 1845-01-01`,
      validate: (record) => {
        if (numValue(record, 14) === 1) return true;
        return String(record[fieldIdx]) === '1845-01-01';
      }
    });
  });

  zeroFields.forEach(fieldIdx => {
    rules.push({
      code: `E9I${String(fieldIdx).padStart(3, '0')}`,
      type: 'error',
      field: fieldIdx,
      description: `No gestante: campo ${fieldIdx} debe ser 0`,
      validate: (record) => {
        if (numValue(record, 14) === 1) return true;
        return numValue(record, fieldIdx) === 0;
      }
    });
  });

  return rules;
}

export function getGestacionRules() {
  return [...buildGestanteActiveRules(), ...buildGestanteInactiveRules()];
}
