import ExcelJS from 'exceljs';
import { buildCitologiasColumns, mapCitologiasRow } from './citologiasExcelColumns.js';

const SHEET_CONFIG = {
  sheetName: 'CITOLOGIA',
  title: 'TOMA DE CITOLOGIA',
  columns: buildCitologiasColumns,
  dataMapper: mapCitologiasRow
};

export async function generateCitologiasExcel(records, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const config = SHEET_CONFIG;
  const cols = config.columns();
  const ws = workbook.addWorksheet(config.sheetName);

  cols.widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  addBannerRows(ws, cols);
  addConsultaRow(ws, config, cols);
  addHeaderRows(ws, cols);
  addDataRows(ws, records, config, cols);

  ws.views = [{ state: 'frozen', ySplit: 8 }];

  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

function addBannerRows(ws, cols) {
  const totalCols = cols.headerRow.length;
  const lastCol = colLetter(totalCols);

  const row1 = ws.addRow([]);
  row1.getCell(1).value = 'IPS TU SALUD EN NUESTRAS MANOS';
  row1.getCell(1).font = { size: 14, bold: true };
  row1.getCell(1).alignment = { horizontal: 'center' };
  ws.mergeCells(`A1:${lastCol}1`);

  const row2 = ws.addRow([]);
  row2.getCell(1).value = 'NIT: 901.249.122';
  row2.getCell(1).font = { size: 10, bold: true };
  row2.getCell(1).alignment = { horizontal: 'center' };
  ws.mergeCells(`A2:${lastCol}2`);

  const row3 = ws.addRow([]);
  row3.getCell(1).value = `VERSION: 1.0 | FECHA: ${new Date().toISOString().split('T')[0]}`;
  row3.getCell(1).font = { size: 9 };
  row3.getCell(1).alignment = { horizontal: 'center' };
  ws.mergeCells(`A3:${lastCol}3`);

  ws.addRow([]);
}

function addConsultaRow(ws, config, cols) {
  const totalCols = cols.headerRow.length;
  const lastCol = colLetter(totalCols);
  const row = ws.addRow([]);
  row.getCell(1).value = config.title;
  row.getCell(1).font = { size: 11, bold: true };
  row.getCell(1).alignment = { horizontal: 'center' };
  row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  ws.mergeCells(`A5:${lastCol}5`);
}

function addHeaderRows(ws, cols) {
  const totalCols = cols.headerRow.length;

  const groupRowExcel = ws.addRow(cols.groupRow);
  styleHeaderRow(groupRowExcel, totalCols);

  const subGroupRowExcel = ws.addRow(cols.subGroupRow);
  styleHeaderRow(subGroupRowExcel, totalCols);

  const headerRowExcel = ws.addRow(cols.headerRow);
  styleHeaderRow(headerRowExcel, totalCols);

  cols.merges.forEach(merge => {
    try {
      ws.mergeCells(merge);
    } catch (_) {}
  });
}

function addDataRows(ws, records, config, cols) {
  const totalCols = cols.headerRow.length;
  records.forEach((record, idx) => {
    const values = config.dataMapper(record, idx);
    const row = ws.addRow(values);
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.font = { size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder();
    }
  });
}

function styleHeaderRow(row, totalCols) {
  for (let c = 1; c <= totalCols; c++) {
    const cell = row.getCell(c);
    cell.font = { size: 9, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  }
}

function thinBorder() {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
}

function colLetter(idx) {
  let result = '';
  let n = idx;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}
