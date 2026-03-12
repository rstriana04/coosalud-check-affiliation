import ExcelJS from 'exceljs';
import { COLUMNS_202, AUXILIARY_COLUMNS } from './resolucion202Columns.js';
import { calculateAge } from './resolucion202Defaults.js';
import { logger } from './logger.js';

const ALL_EXCEL_COLUMNS = [...COLUMNS_202, ...AUXILIARY_COLUMNS];

const HEADER_LABELS = ALL_EXCEL_COLUMNS.map((col) => col.label);

export async function generateResolucion202Excel(records, outputPath, metadata) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Registro Tipo 2');

  setupColumnWidths(worksheet);
  addHeaderRow(worksheet);
  addDataRows(worksheet, records);
  applyFreezePaneAndFilter(worksheet);

  await workbook.xlsx.writeFile(outputPath);

  logger.info('Resolucion 202 Excel generado', {
    outputPath,
    records: records.length,
    periodo: `${metadata?.periodoInicio} - ${metadata?.periodoFin}`,
  });

  return outputPath;
}

function getColumnWidth(col) {
  if (col.type === 'F') return 12;
  if (col.type === 'D') return 8;
  if (col.name.includes('nombre') || col.name.includes('apellido')) return 15;
  if (col.name.includes('identificacion')) return 18;
  if (col.type === 'N') return 8;
  return 12;
}

function setupColumnWidths(worksheet) {
  ALL_EXCEL_COLUMNS.forEach((col, i) => {
    worksheet.getColumn(i + 1).width = getColumnWidth(col);
  });
}

function addHeaderRow(worksheet) {
  const row = worksheet.addRow(HEADER_LABELS);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 9 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = thinBorder();
  });
}

function addDataRows(worksheet, records) {
  records.forEach((record, idx) => {
    const values = buildRowValues(record, idx);
    const row = worksheet.addRow(values);
    styleDataRow(row);
  });
}

function buildRowValues(record, idx) {
  const official = COLUMNS_202.map((col) => {
    if (col.index === 0) return record[col.name] ?? col.defaultValue ?? 2;
    if (col.index === 1) return record[col.name] || idx + 1;
    return resolveFieldValue(record, col);
  });

  const edad = computeAge(record);
  const cups = record.source_program || record.cups || '';
  const fechaConsulta = record.fecha_consulta || '';

  return [...official, cups, edad, fechaConsulta];
}

function resolveFieldValue(record, col) {
  const value = record[col.name];
  if (value !== undefined && value !== null) return value;
  if (col.defaultValue !== undefined && col.defaultValue !== null) {
    return col.defaultValue;
  }
  return '';
}

function styleDataRow(row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { size: 9 };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });
}

function computeAge(record) {
  const fechaNac = record.fecha_nacimiento;
  if (!fechaNac || fechaNac === '1800-01-01') return '';
  return calculateAge(fechaNac, new Date());
}

function applyFreezePaneAndFilter(worksheet) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ALL_EXCEL_COLUMNS.length },
  };
}

function thinBorder() {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}
