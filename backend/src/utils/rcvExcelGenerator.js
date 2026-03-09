import ExcelJS from 'exceljs';
import { logger } from './logger.js';

const ROW1_VALUES = {
  A1: '#', B1: 'FECHA',
  C1: 'TIPO DE INSCRIPCIÓN',
  E1: 'PRIMER APELLIDO', F1: 'SEGUNDO APELLIDO',
  G1: 'PRIMER NOMBRE', H1: 'SEGUNDO NOMBRE',
  I1: 'TIPO DE IDENTIFICACION (CC, TI, PT,CE)',
  J1: 'NUMERO DE IDENTIFICACION',
  K1: 'DIRECCION RESIDENCIA', L1: 'TELEFONOS',
  M1: 'FECHA NACIMIENTO', N1: 'EDAD EN LA CONSULTA',
  O1: 'SEXO', P1: 'PESO (Kg)', Q1: 'TALLA (Cm)', R1: 'IMC (Kg/m2)'
};

const ROW2_LABELS = [
  '#', 'AAAA-MM-DD', '1° VEZ', 'CONTROL',
  'PRIMER APELLIDO', 'SEGUNDO APELLIDO', 'PRIMER NOMBRE', 'SEGUNDO NOMBRE',
  'TIPO DE IDENTIFICACION (CC, TI, PT,CE)', 'NUMERO DE IDENTIFICACION',
  'DIRECCION RESIDENCIA', 'TELEFONOS', 'AAAA-MM-DD',
  'EDAD EN LA CONSULTA', 'SEXO', 'PESO (Kg)', 'TALLA (Cm)', 'IMC (Kg/m2)',
  'HT', 'DM', 'ENFERMEDAD RENAL (ERC)', 'DISLIPIDEMIA',
  'PRESION ARTERIAL ACTUAL', 'PRESION ARTERIAL CONTROL ANTERIOR',
  'FECHA LABORATORIO HDL', 'HDL (MG/DL)',
  'FECHA LABORATORIO LDL', 'LDL (MG/DL)',
  'FECHA LABORATORIO CT', 'COLESTEROL TOTAL (MG/DL)',
  'FECHA LABORATORIO TG', 'TRIGLICERIDOS (MG/DL)',
  'FECHA LABORATORIO GLUCOSA', 'GLUCOSA (MG/DL)',
  'FECHA LABORATORIO CREATININA', 'CREATININA (MG/DL)',
  'FECHA LABORATORIO UROANALISIS', 'UROANALISIS (PATOLOGICO/NO PATOLOGICO)',
  'FECHA LABORATORIO PSA', 'PSA HOMBRES (DE 50 AÑOS EN ADELANTE) (NG/ML)<4,0',
  'FECHA LABORATORIO SANGRE OCULTA EN HECES',
  'SANGRE OCULTA EN HECES HOMBRES Y MUJERES (50-75 AÑOS) POSITIVO/NEGATIVO',
  'FECHA LABORATORIO HEMOGRAMA', 'HEMOGRAMA',
  'FECHA LABORATORIO HEMOGLOBINA GLICOSILADA', 'HEMOGLOBINA GLICOSILADA %',
  'TOMA DE PERIMETRO', 'PERIMETRO ABDOMINAL'
];

const VERTICAL_MERGES = [
  'A1:A2', 'E1:E2', 'F1:F2', 'G1:G2', 'H1:H2',
  'I1:I2', 'J1:J2', 'K1:K2', 'L1:L2',
  'N1:N2', 'O1:O2', 'P1:P2', 'Q1:Q2', 'R1:R2'
];

const HORIZONTAL_MERGES = ['C1:D1', 'S1:AR1'];

const COL_WIDTHS = [
  5, 14, 12, 12,
  20, 20, 20, 20,
  18, 22,
  40, 15, 14,
  12, 8, 10, 10, 12,
  6, 6, 12, 14,
  18, 22,
  16, 12, 16, 12, 16, 16,
  16, 14, 16, 12,
  18, 14, 18, 20,
  16, 18,
  22, 24,
  18, 14,
  22, 16,
  16, 18
];

export async function generateRCVExcel(rcvDataArray, outputPath, programa) {
  const workbook = new ExcelJS.Workbook();
  const sheetName = programa || 'RCV';
  const worksheet = workbook.addWorksheet(sheetName);

  setupColumns(worksheet);
  addHeaderRows(worksheet);
  addDataRows(worksheet, rcvDataArray);
  applyFreezePane(worksheet);

  await workbook.xlsx.writeFile(outputPath);

  logger.info('RCV Excel generado', { outputPath, records: rcvDataArray.length });
  return outputPath;
}

function setupColumns(ws) {
  ws.columns = COL_WIDTHS.map((width, i) => ({ width, key: `col${i}` }));
}

function addHeaderRows(ws) {
  const row1 = ws.addRow(new Array(48).fill(''));
  const row2 = ws.addRow(ROW2_LABELS);

  for (const [cellRef, value] of Object.entries(ROW1_VALUES)) {
    ws.getCell(cellRef).value = value;
  }

  VERTICAL_MERGES.forEach(range => ws.mergeCells(range));
  HORIZONTAL_MERGES.forEach(range => ws.mergeCells(range));

  styleHeaderRow(row1);
  styleHeaderRow(row2);
}

function styleHeaderRow(row) {
  row.height = 30;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder();
  });
}

function addDataRows(ws, dataArray) {
  dataArray.forEach((d, idx) => {
    const values = [
      idx + 1,
      d.fecha || '',
      d.tipoInscripcion1aVez || '',
      d.tipoInscripcionControl || '',
      d.primerApellido || '',
      d.segundoApellido || '',
      d.primerNombre || '',
      d.segundoNombre || '',
      d.tipoIdentificacion || '',
      d.numeroIdentificacion || '',
      d.direccionResidencia || '',
      d.telefonos || '',
      d.fechaNacimiento || '',
      d.edadConsulta ?? '',
      d.sexo || '',
      d.pesoKg ?? '',
      d.tallaCm ?? '',
      d.imc ?? '',
      d.ht || 'NO',
      d.dm || 'NO',
      d.erc || 'NO',
      d.dislipidemia || 'NO',
      d.presionArterial || '',
      d.presionArterialAnterior || '',
      d.fechaLabHdl || '',
      d.hdl ?? '',
      d.fechaLabLdl || '',
      d.ldl ?? '',
      d.fechaLabCt || '',
      d.colesterolTotal ?? '',
      d.fechaLabTg || '',
      d.trigliceridos ?? '',
      d.fechaLabGlucosa || '',
      d.glucosa ?? '',
      d.fechaLabCreatinina || '',
      d.creatinina ?? '',
      d.fechaLabUroanalisis || '',
      d.uroanalisis || '',
      d.fechaLabPsa || '',
      d.psa ?? '',
      d.fechaLabSangreOculta || '',
      d.sangreOculta || '',
      d.fechaLabHemograma || '',
      d.hemograma ?? '',
      d.fechaLabHba1c || '',
      d.hba1c ?? '',
      d.tomaPerimetro || '',
      d.perimetroAbdominal ?? ''
    ];

    const row = ws.addRow(values);
    styleDataRow(row);
  });
}

function styleDataRow(row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.font = { size: 10 };
  });
}

function applyFreezePane(ws) {
  ws.views = [{ state: 'frozen', ySplit: 2 }];
}

function thinBorder() {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
}
