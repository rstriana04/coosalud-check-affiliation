import COLUMNS_202 from './resolucion202Columns.js';
import {
  isValidDateFormat, isValidDate, isDateWithinPeriod,
  isSentinelDate, isValidName, isInRange
} from './resolucion202ValidationHelpers.js';

function buildListaRules() {
  const listaColumns = COLUMNS_202.filter(c => c.allowedValues && c.allowedValues.length > 0);

  return listaColumns.flatMap(col => {
    const rules = [];

    rules.push({
      code: `E1${String(col.index).padStart(3, '0')}`,
      type: 'error',
      field: col.index,
      description: `${col.label} debe tener un valor permitido: [${col.allowedValues.join(', ')}]`,
      validate: (record) => {
        const val = record[col.index];
        if (val === null || val === undefined || val === '') return false;
        return col.allowedValues.includes(Number(val)) || col.allowedValues.includes(String(val));
      }
    });

    return rules;
  });
}

function buildCodigoRules() {
  return [
    {
      code: 'E2001',
      type: 'error',
      field: 2,
      description: 'Codigo habilitacion IPS debe ser exactamente 12 digitos',
      validate: (record) => /^\d{12}$/.test(String(record[2]))
    },
    {
      code: 'E2002',
      type: 'error',
      field: 12,
      description: 'Codigo ocupacion debe ser 4 digitos o 9998/9999',
      validate: (record) => {
        const val = String(record[12]);
        return /^\d{4}$/.test(val);
      }
    },
    {
      code: 'E2003',
      type: 'error',
      field: 90,
      description: 'Codigo habilitacion IPS citologia debe ser 12 digitos, 0 o 999',
      validate: (record) => {
        const val = String(record[90]);
        return /^\d{12}$/.test(val) || val === '0' || val === '999';
      }
    },
    {
      code: 'E2004',
      type: 'error',
      field: 102,
      description: 'COP debe ser 12 digitos, 0 o 21',
      validate: (record) => {
        const val = String(record[102]);
        return /^\d{12}$/.test(val) || val === '0' || val === '21';
      }
    }
  ];
}

function buildDateRules() {
  const dateColumns = COLUMNS_202.filter(c => c.type === 'F');

  return dateColumns.flatMap(col => {
    const rules = [];

    rules.push({
      code: `E3${String(col.index).padStart(3, '0')}`,
      type: 'error',
      field: col.index,
      description: `${col.label} debe tener formato YYYY-MM-DD y ser una fecha valida`,
      validate: (record) => {
        const val = String(record[col.index]);
        return isValidDateFormat(val) && isValidDate(val);
      }
    });

    if (col.index !== 33) {
      rules.push({
        code: `E3${String(col.index).padStart(3, '0')}P`,
        type: 'error',
        field: col.index,
        description: `${col.label} no debe ser posterior al periodo de reporte`,
        validate: (record, context) => {
          const val = String(record[col.index]);
          if (!isValidDateFormat(val) || isSentinelDate(val)) return true;
          return isDateWithinPeriod(val, context.reportingPeriodEnd);
        }
      });
    }

    return rules;
  });
}

function buildResultadoRules() {
  return [
    {
      code: 'E4030',
      type: 'error',
      field: 30,
      description: 'Peso debe estar entre 0.2 y 250, o ser 999',
      validate: (record) => isInRange(record[30], 0.2, 250, [999])
    },
    {
      code: 'E4032',
      type: 'error',
      field: 32,
      description: 'Talla debe estar entre 20 y 225, o ser 999',
      validate: (record) => isInRange(record[32], 20, 225, [999])
    },
    {
      code: 'E4057',
      type: 'error',
      field: 57,
      description: 'Glicemia debe estar entre 0.1 y 900, o ser 0 o 998',
      validate: (record) => isInRange(record[57], 0.1, 900, [0, 998])
    },
    {
      code: 'E4092',
      type: 'error',
      field: 92,
      description: 'LDL debe estar entre 0.1 y 900, o ser 0 o 998',
      validate: (record) => isInRange(record[92], 0.1, 900, [0, 998])
    },
    {
      code: 'E4095',
      type: 'error',
      field: 95,
      description: 'HDL debe estar entre 0 y 900, o ser 0 o 998',
      validate: (record) => isInRange(record[95], 0, 900, [0, 998])
    },
    {
      code: 'E4098',
      type: 'error',
      field: 98,
      description: 'Trigliceridos debe estar entre 0.1 y 6000, o ser 0 o 998',
      validate: (record) => isInRange(record[98], 0.1, 6000, [0, 998])
    },
    {
      code: 'E4104',
      type: 'error',
      field: 104,
      description: 'Hemoglobina debe estar entre 1.1 y 25, o ser 0 o 998',
      validate: (record) => isInRange(record[104], 1.1, 25, [0, 998])
    },
    {
      code: 'E4107',
      type: 'error',
      field: 107,
      description: 'Creatinina debe estar entre 0.1 y 37, o ser 0 o 998',
      validate: (record) => isInRange(record[107], 0.1, 37, [0, 998])
    },
    {
      code: 'E4109',
      type: 'error',
      field: 109,
      description: 'PSA debe estar entre 0 y 3000, o ser 0 o 998',
      validate: (record) => isInRange(record[109], 0, 3000, [0, 998])
    }
  ];
}

function buildNameRules() {
  const nameFields = [
    { index: 5, label: 'Primer apellido' },
    { index: 6, label: 'Segundo apellido' },
    { index: 7, label: 'Primer nombre' },
    { index: 8, label: 'Segundo nombre' }
  ];

  return nameFields.map(field => ({
    code: `E5${String(field.index).padStart(3, '0')}`,
    type: 'error',
    field: field.index,
    description: `${field.label} solo debe contener A-Z, espacio y Ñ, maximo 30 caracteres`,
    validate: (record) => {
      const val = String(record[field.index]);
      if (val === 'NONE') return true;
      return isValidName(val);
    }
  }));
}

export function getTypeRules() {
  return [
    ...buildListaRules(),
    ...buildCodigoRules(),
    ...buildDateRules(),
    ...buildResultadoRules(),
    ...buildNameRules()
  ];
}
