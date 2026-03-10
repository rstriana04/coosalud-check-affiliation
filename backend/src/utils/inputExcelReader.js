import ExcelJS from 'exceljs';
import { logger } from './logger.js';

const REQUIRED_COLUMNS = ['identipac', 'fecha_atencion', 'nombremedico'];

export async function readInputExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No se encontró ninguna hoja en el archivo Excel');
  }

  const columnMap = buildColumnMap(worksheet.getRow(1));
  validateRequiredColumns(columnMap);

  const patients = [];
  let programa = null;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const identipac = normalizeString(row.getCell(columnMap.identipac).value);
    const fechaRaw = row.getCell(columnMap.fecha_atencion).value;
    const nombremedico = normalizeString(row.getCell(columnMap.nombremedico).value);

    if (!identipac || !fechaRaw) return;

    const fecha_atencion = normalizeDate(fechaRaw);

    if (!fecha_atencion) {
      logger.warn('Fecha inválida, omitiendo fila', { rowNumber, fechaRaw });
      return;
    }

    const record = { identipac, fecha_atencion, nombremedico, rowNumber };

    if (columnMap.programa) {
      const prog = normalizeString(row.getCell(columnMap.programa).value);
      record.programa = prog;
      if (!programa && prog) programa = prog;
    }

    patients.push(record);
  });

  if (patients.length === 0) {
    throw new Error('El archivo Excel no contiene registros de pacientes');
  }

  logger.info('Input Excel leído correctamente', {
    totalPatients: patients.length,
    programa
  });

  return { patients, programa };
}

function buildColumnMap(headerRow) {
  const map = {};
  headerRow.eachCell((cell, colNumber) => {
    const value = normalizeString(cell.value).toLowerCase();
    if (value) map[value] = colNumber;
  });
  return map;
}

function validateRequiredColumns(columnMap) {
  const missing = REQUIRED_COLUMNS.filter(col => !columnMap[col]);
  if (missing.length > 0) {
    const found = Object.keys(columnMap).join(', ');
    throw new Error(
      `Columnas requeridas no encontradas: ${missing.join(', ')}. Columnas disponibles: ${found}`
    );
  }
}

function normalizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeDate(raw) {
  if (raw instanceof Date) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(raw).trim();

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;

  const dmyDashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmyDashMatch) return `${dmyDashMatch[3]}-${dmyDashMatch[2]}-${dmyDashMatch[1]}`;

  return null;
}
