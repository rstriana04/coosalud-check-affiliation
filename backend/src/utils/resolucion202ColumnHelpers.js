import COLUMNS_202 from './resolucion202Columns.js';

const COLUMN_GROUPS = COLUMNS_202.reduce((groups, col) => {
  if (!groups[col.group]) {
    groups[col.group] = [];
  }
  groups[col.group].push(col.index);
  return groups;
}, {});

const DATE_SENTINELS = {
  '1800-01-01': 'Sin dato',
  '1805-01-01': 'No realizado por tradicion',
  '1810-01-01': 'No realizado por condicion de salud',
  '1825-01-01': 'No realizado por rechazo del usuario',
  '1830-01-01': 'No realizado por datos de contacto desactualizados',
  '1835-01-01': 'No realizado por otras razones',
  '1845-01-01': 'No aplica',
};

const RESULT_SENTINELS = {
  NO_APLICA: 0,
  SIN_DATO: 998,
  NO_EVALUADO: 21,
};

const indexMap = new Map(COLUMNS_202.map(col => [col.index, col]));
const nameMap = new Map(COLUMNS_202.map(col => [col.name, col]));

function getColumnByIndex(index) {
  return indexMap.get(index) || null;
}

function getColumnByName(name) {
  return nameMap.get(name) || null;
}

function getColumnsByGroup(group) {
  return COLUMNS_202.filter(col => col.group === group);
}

export {
  COLUMNS_202,
  COLUMN_GROUPS,
  DATE_SENTINELS,
  RESULT_SENTINELS,
  getColumnByIndex,
  getColumnByName,
  getColumnsByGroup,
};
