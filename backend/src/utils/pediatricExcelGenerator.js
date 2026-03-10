import ExcelJS from 'exceljs';
import { logger } from './logger.js';
import {
  buildPrimeraInfanciaColumns, buildInfanciaColumns, buildAdolescenciaColumns,
  mapPrimeraInfanciaRow, mapInfanciaRow, mapAdolescenciaRow
} from './pediatricExcelColumns.js';

const SHEET_CONFIG = {
  'primera-infancia': {
    sheetName: 'PRIMERA INFANCIA',
    title: 'BASE PRIMERA INFANCIA',
    columns: buildPrimeraInfanciaColumns(),
    dataMapper: mapPrimeraInfanciaRow
  },
  'infancia': {
    sheetName: 'INFANCIA',
    title: 'BASE INFANCIA',
    columns: buildInfanciaColumns(),
    dataMapper: mapInfanciaRow
  },
  'adolescencia': {
    sheetName: 'ADOLESCENCIA',
    title: 'BASE ADOLESCENCIA',
    columns: buildAdolescenciaColumns(),
    dataMapper: mapAdolescenciaRow
  }
};

export async function generatePediatricExcel(dataByProgram, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const programOrder = ['primera-infancia', 'infancia', 'adolescencia'];

  for (const programa of programOrder) {
    const records = dataByProgram[programa];
    if (!records || records.length === 0) continue;

    const config = SHEET_CONFIG[programa];
    const ws = workbook.addWorksheet(config.sheetName);

    addBannerRows(ws, config);
    addHeaderRows(ws, config);
    addDataRows(ws, records, config);
    ws.views = [{ state: 'frozen', ySplit: 6 }];
  }

  await workbook.xlsx.writeFile(outputPath);
  const total = Object.values(dataByProgram).reduce((s, a) => s + (a?.length || 0), 0);
  logger.info('Pediatric Excel generado', { outputPath, totalRecords: total });
  return outputPath;
}

function addBannerRows(ws, config) {
  const totalCols = config.columns.row5.length;

  const row1 = ws.addRow(new Array(totalCols).fill(''));
  const row2 = ws.addRow(new Array(totalCols).fill(''));
  const row3 = ws.addRow(new Array(totalCols).fill(''));

  ws.mergeCells('A1:E3');
  ws.mergeCells('F1:J3');
  ws.getCell('F1').value = config.title;
  ws.getCell('F1').font = { bold: true, size: 14 };
  ws.getCell('F1').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.getCell('K1').value = 'NIT';
  ws.getCell('L1').value = '901277003-1';
  ws.getCell('K2').value = 'VERSION';
  ws.getCell('L2').value = '1';
  ws.getCell('K3').value = 'FECHA';
  ws.getCell('L3').value = new Date().toISOString().split('T')[0];

  for (const r of [row1, row2, row3]) {
    r.height = 20;
    r.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder();
    });
  }

  const row4 = ws.addRow(new Array(totalCols).fill(''));
  ws.mergeCells(`A4:${colLetter(totalCols - 1)}4`);
  row4.height = 5;
}

function addHeaderRows(ws, config) {
  const row5 = ws.addRow(config.columns.row5);
  const row6 = ws.addRow(config.columns.row6);

  for (const merge of config.columns.merges) {
    ws.mergeCells(merge);
  }

  config.columns.widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  styleHeaderRow(row5);
  styleHeaderRow(row6);
}

function addDataRows(ws, dataArray, config) {
  dataArray.forEach((d, idx) => {
    const row = ws.addRow(config.dataMapper(d, idx));
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder();
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.font = { size: 9 };
    });
  });
}

function styleHeaderRow(row) {
  row.height = 35;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
}

function thinBorder() {
  return {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
}

function colLetter(idx) {
  let letter = '';
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}
