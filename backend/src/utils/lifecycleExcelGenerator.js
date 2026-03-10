import ExcelJS from 'exceljs';
import { logger } from './logger.js';
import {
  buildJuventudColumns, buildAdultezColumns, buildVejezColumns,
  mapJuventudRow, mapAdultezRow, mapVejezRow
} from './lifecycleExcelColumns.js';

const SHEET_CONFIG = {
  'juventud': {
    sheetName: 'JUVENTUD',
    title: 'BASE PROGRAMA JUVENTUD',
    columns: buildJuventudColumns(),
    dataMapper: mapJuventudRow
  },
  'adultez': {
    sheetName: 'ADULTEZ',
    title: 'BASE PROGRAMA ADULTEZ',
    columns: buildAdultezColumns(),
    dataMapper: mapAdultezRow
  },
  'vejez': {
    sheetName: 'VEJEZ',
    title: 'BASE PROGRAMA VEJEZ',
    columns: buildVejezColumns(),
    dataMapper: mapVejezRow
  }
};

export async function generateLifecycleExcel(dataByProgram, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const programOrder = ['juventud', 'adultez', 'vejez'];

  for (const programa of programOrder) {
    const records = dataByProgram[programa];
    if (!records || records.length === 0) continue;

    const config = SHEET_CONFIG[programa];
    const ws = workbook.addWorksheet(config.sheetName);

    addBannerRows(ws, config);
    addConsultaRow(ws, config);
    addHeaderRows(ws, config);
    addDataRows(ws, records, config);
    ws.views = [{ state: 'frozen', ySplit: 7 }];
  }

  await workbook.xlsx.writeFile(outputPath);
  const total = Object.values(dataByProgram).reduce((s, a) => s + (a?.length || 0), 0);
  logger.info('Lifecycle Excel generado', { outputPath, totalRecords: total });
  return outputPath;
}

function addBannerRows(ws, config) {
  const totalCols = config.columns.headerRow.length;

  const row1 = ws.addRow(new Array(totalCols).fill(''));
  const row2 = ws.addRow(new Array(totalCols).fill(''));
  const row3 = ws.addRow(new Array(totalCols).fill(''));

  ws.mergeCells('A1:C3');
  ws.mergeCells('D1:F1');
  ws.mergeCells('D2:F2');
  ws.mergeCells('D3:F3');
  ws.mergeCells('H1:I1');
  ws.mergeCells('H2:I2');
  ws.mergeCells('H3:I3');

  ws.getCell('D1').value = config.title;
  ws.getCell('D2').value = config.title;
  ws.getCell('D3').value = config.title;
  ws.getCell('G1').value = 'NIT';
  ws.getCell('H1').value = '901277003-1';
  ws.getCell('G2').value = 'VERSIÓN';
  ws.getCell('H2').value = '1';
  ws.getCell('G3').value = 'FECHA';
  ws.getCell('H3').value = new Date().toISOString().split('T')[0];

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

function addConsultaRow(ws, config) {
  const totalCols = config.columns.headerRow.length;
  const vals = new Array(totalCols).fill('');
  vals[0] = 'CONSULTA POR MEDICINA GENERAL';
  const row5 = ws.addRow(vals);

  row5.height = 25;
  row5.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
}

function addHeaderRows(ws, config) {
  const row6 = ws.addRow(config.columns.groupRow);
  const row7 = ws.addRow(config.columns.headerRow);

  for (const merge of config.columns.merges) {
    ws.mergeCells(merge);
  }

  config.columns.widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  styleHeaderRow(row6);
  styleHeaderRow(row7);
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
