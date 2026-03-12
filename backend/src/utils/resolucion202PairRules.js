import { isRealDate, isSentinelDate, numValue } from './resolucion202ValidationHelpers.js';

const LAB_PAIRS = [
  { dateField: 72, resultFields: [92], label: 'LDL' },
  { dateField: 111, resultFields: [95], label: 'HDL' },
  { dateField: 118, resultFields: [98], label: 'Trigliceridos' },
  { dateField: 105, resultFields: [57], label: 'Glicemia' },
  { dateField: 106, resultFields: [107], label: 'Creatinina' },
  { dateField: 103, resultFields: [104], label: 'Hemoglobina' },
  { dateField: 73, resultFields: [109], label: 'PSA' },
  { dateField: 78, resultFields: [79], label: 'Hepatitis B' },
  { dateField: 80, resultFields: [81], label: 'Sifilis' },
  { dateField: 82, resultFields: [83], label: 'VIH' },
  { dateField: 110, resultFields: [42], label: 'Hepatitis C' },
  { dateField: 84, resultFields: [85], label: 'TSH neonatal' },
  { dateField: 66, resultFields: [36], label: 'Colonoscopia' },
  { dateField: 67, resultFields: [24], label: 'Sangre oculta' },
  { dateField: 87, resultFields: [88], label: 'Tamizaje cervix' },
  { dateField: 93, resultFields: [94], label: 'Biopsia cervix' },
  { dateField: 96, resultFields: [97], label: 'Mamografia' },
  { dateField: 62, resultFields: [27, 28], label: 'Agudeza visual' },
  { dateField: 64, resultFields: [22], label: 'Tacto rectal' },
  { dateField: 69, resultFields: [37], label: 'Tamizaje auditivo' },
  { dateField: 75, resultFields: [38], label: 'Tamizaje visual neonatal' },
  { dateField: 65, resultFields: [48], label: 'Oximetria' },
  { dateField: 63, resultFields: [40], label: 'VALE' },
  { dateField: 76, resultFields: [102], label: 'Odontologia' },
  { dateField: 112, resultFields: [113], label: 'Baciloscopia' }
];

function isNoResult(value) {
  const num = Number(value);
  return num === 0 || num === 998 || num === 21;
}

function buildRealDateRequiresResult(pair) {
  return pair.resultFields.map(resultField => ({
    code: `E8R${String(pair.dateField).padStart(3, '0')}`,
    type: 'error',
    field: [pair.dateField, resultField],
    description: `${pair.label}: si fecha (${pair.dateField}) es real, resultado (${resultField}) no debe ser 0/998/21`,
    validate: (record) => {
      const dateVal = String(record[pair.dateField]);
      if (!isRealDate(dateVal)) return true;
      return !isNoResult(record[resultField]);
    }
  }));
}

function buildSentinelDateRequiresSentinelResult(pair) {
  return pair.resultFields.map(resultField => ({
    code: `E8S${String(pair.dateField).padStart(3, '0')}`,
    type: 'error',
    field: [pair.dateField, resultField],
    description: `${pair.label}: si fecha (${pair.dateField}) es centinela, resultado (${resultField}) debe ser 0/998/21`,
    validate: (record) => {
      const dateVal = String(record[pair.dateField]);
      if (!isSentinelDate(dateVal)) return true;
      return isNoResult(record[resultField]);
    }
  }));
}

function buildNotApplicableDateRequiresZero(pair) {
  return pair.resultFields.map(resultField => ({
    code: `E8A${String(pair.dateField).padStart(3, '0')}`,
    type: 'error',
    field: [pair.dateField, resultField],
    description: `${pair.label}: si fecha (${pair.dateField}) es 1845-01-01 (no aplica), resultado (${resultField}) debe ser 0`,
    validate: (record) => {
      const dateVal = String(record[pair.dateField]);
      if (dateVal !== '1845-01-01') return true;
      return numValue(record, resultField) === 0;
    }
  }));
}

export function getPairRules() {
  const rules = [];

  LAB_PAIRS.forEach(pair => {
    rules.push(...buildRealDateRequiresResult(pair));
    rules.push(...buildSentinelDateRequiresSentinelResult(pair));
    rules.push(...buildNotApplicableDateRequiresZero(pair));
  });

  return rules;
}
