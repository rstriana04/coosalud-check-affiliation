import { writeFileSync } from 'fs';
import { COLUMNS_202 } from './resolucion202Columns.js';
import { logger } from './logger.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NAME_PATTERN = /[^A-Z \u00D1]/g;

export function generateResolucion202Txt(records, outputPath, controlRecord) {
  const controlLine = buildControlLine(controlRecord, records.length);
  const detailLines = records.map((record, idx) => buildDetailLine(record, idx));
  const content = [controlLine, ...detailLines].join('\n');

  writeFileSync(outputPath, content, 'utf-8');

  logger.info('Resolucion 202 TXT generado', {
    outputPath,
    records: records.length,
    periodo: `${controlRecord.fechaInicio} - ${controlRecord.fechaFin}`,
  });

  return outputPath;
}

export function generateResolucion202Filename(
  periodoFin,
  entityType,
  entityId,
  regime,
  sequence
) {
  const datePart = periodoFin.replace(/-/g, '');
  const paddedEntityId = entityId.toString().padEnd(12, ' ');
  const paddedSeq = sequence.toString().padStart(2, '0');

  return `SGD280RPED${datePart}${entityType}${paddedEntityId}${regime}${paddedSeq}.TXT`;
}

export function cleanNameField(value) {
  if (value === null || value === undefined) return '';
  const upper = removeTildes(String(value).toUpperCase());
  return upper.replace(NAME_PATTERN, '').trim();
}

export function formatFieldValue(value, columnType) {
  if (value === null || value === undefined || value === '') return '';

  const formatters = { N: formatNumeric, A: formatAlpha, F: formatDate, D: formatDecimal };
  const formatter = formatters[columnType];

  return formatter ? formatter(value) : String(value);
}

function formatNumeric(value) {
  const str = String(value).replace(/,/g, '');
  return str.replace(/[^\d-]/g, '') || str;
}

function formatAlpha(value) {
  return removeTildes(String(value).toUpperCase());
}

function formatDate(value) {
  const str = String(value);
  if (DATE_PATTERN.test(str)) return str;
  return str;
}

function formatDecimal(value) {
  const str = String(value).replace(',', '.');
  const num = Number(str);
  if (isNaN(num)) return str;
  return num.toString();
}

function buildControlLine(controlRecord, totalRecords) {
  const paddedTotal = String(totalRecords).padStart(8, '0');
  return [
    '1',
    controlRecord.codigoEntidad,
    controlRecord.fechaInicio,
    controlRecord.fechaFin,
    paddedTotal,
  ].join('|');
}

function buildDetailLine(record, idx) {
  const fields = COLUMNS_202.map((col) => {
    const rawValue = resolveRecordValue(record, col, idx);
    return formatForTxt(rawValue, col);
  });

  return fields.join('|');
}

function resolveRecordValue(record, col, idx) {
  if (col.index === 0) return record[col.name] ?? col.defaultValue ?? 2;
  if (col.index === 1) return record[col.name] || idx + 1;

  const value = record[col.name];
  if (value !== undefined && value !== null) return value;
  if (col.defaultValue !== undefined && col.defaultValue !== null) {
    return col.defaultValue;
  }
  return '';
}

function formatForTxt(value, col) {
  if (value === '' || value === null || value === undefined) return '';
  if (col.type === 'A') return cleanTextField(String(value));
  return formatFieldValue(value, col.type);
}

function cleanTextField(text) {
  return removeTildes(text.toUpperCase()).replace(/[^\w\s\u00D1.-]/g, '').trim();
}

function removeTildes(text) {
  const tildeMap = {
    '\u00C1': 'A', '\u00C9': 'E', '\u00CD': 'I', '\u00D3': 'O', '\u00DA': 'U',
    '\u00E1': 'A', '\u00E9': 'E', '\u00ED': 'I', '\u00F3': 'O', '\u00FA': 'U',
    '\u00FC': 'U', '\u00DC': 'U',
  };

  return text.replace(/[\u00C1\u00C9\u00CD\u00D3\u00DA\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00DC]/g, (char) => tildeMap[char] || char);
}
