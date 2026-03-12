import ExcelJS from 'exceljs';
import { COLUMNS_202 } from './resolucion202Columns.js';
import { logger } from './logger.js';

const HEADER_LABELS = [
  'Tipo de registro',
  'Consecutivo de registro',
  'Codigo habilitacion IPS primaria',
  'Tipo de identificacion del usuario',
  'Numero de identificacion del usuario',
  'Primer apellido',
  'Segundo apellido',
  'Primer nombre',
  'Segundo nombre',
  'Fecha de nacimiento',
  'Sexo',
  'Codigo pertenencia etnica',
  'Codigo de ocupacion',
  'Codigo nivel educativo',
  'Gestante',
  'Sifilis gestacional o congenita',
  'Resultado prueba mini-mental state',
  'Hipotiroidismo congenito',
  'Sintomatico respiratorio',
  'Consumo de tabaco',
  'Lepra',
  'Obesidad o desnutricion',
  'Resultado tacto rectal',
  'Acido folico preconcepcional',
  'Resultado sangre oculta materia fecal',
  'Enfermedad mental',
  'Cancer de cervix',
  'Agudeza visual ojo izquierdo',
  'Agudeza visual ojo derecho',
  'Fecha del peso',
  'Peso en kilogramos',
  'Fecha de la talla',
  'Talla en centimetros',
  'Fecha probable de parto',
  'Codigo pais',
  'Clasificacion riesgo gestacional',
  'Resultado colonoscopia',
  'Resultado tamizaje auditivo neonatal',
  'Resultado tamizaje visual neonatal',
  'DPT menores de 5 anos',
  'Resultado tamizaje VALE',
  'Neumococo',
  'Resultado hepatitis C',
  'Resultado motricidad gruesa',
  'Resultado motricidad fina',
  'Resultado personal social',
  'Resultado audicion lenguaje',
  'Tratamiento ablativo',
  'Resultado oximetria',
  'Fecha atencion parto',
  'Fecha salida parto',
  'Fecha lactancia materna',
  'Fecha consulta valoracion integral',
  'Fecha asesoria anticoncepcion',
  'Suministro metodo anticonceptivo',
  'Fecha suministro anticonceptivo',
  'Fecha primera consulta prenatal',
  'Resultado glicemia basal',
  'Fecha ultimo control prenatal',
  'Suministro acido folico prenatal',
  'Suministro sulfato ferroso',
  'Suministro carbonato calcio',
  'Fecha agudeza visual',
  'Fecha tamizaje VALE',
  'Fecha tacto rectal',
  'Fecha oximetria',
  'Fecha colonoscopia',
  'Fecha sangre oculta',
  'Consulta psicologia',
  'Fecha tamizaje auditivo neonatal',
  'Suministro fortificacion casera',
  'Suministro vitamina A',
  'Fecha toma LDL',
  'Fecha toma PSA',
  'Preservativos ITS',
  'Fecha tamizaje visual neonatal',
  'Fecha salud bucal',
  'Suministro hierro primera infancia',
  'Fecha hepatitis B',
  'Resultado hepatitis B',
  'Fecha sifilis',
  'Resultado sifilis',
  'Fecha VIH',
  'Resultado VIH',
  'Fecha TSH neonatal',
  'Resultado TSH neonatal',
  'Tamizaje cancer cervix',
  'Fecha tamizaje cervix',
  'Resultado tamizaje cervix',
  'Calidad muestra citologia',
  'Codigo IPS citologia',
  'Fecha colposcopia',
  'Resultado LDL',
  'Fecha biopsia cervix',
  'Resultado biopsia cervix',
  'Resultado HDL',
  'Fecha mamografia',
  'Resultado mamografia',
  'Resultado trigliceridos',
  'Fecha biopsia mama',
  'Fecha resultado biopsia mama',
  'Resultado biopsia mama',
  'COP por persona',
  'Fecha hemoglobina',
  'Resultado hemoglobina',
  'Fecha glicemia basal',
  'Fecha creatinina',
  'Resultado creatinina',
  'Preservativos ITS fecha',
  'Resultado PSA',
  'Fecha hepatitis C',
  'Fecha toma HDL',
  'Fecha baciloscopia',
  'Resultado baciloscopia',
  'Clasificacion riesgo cardiovascular',
  'Tratamiento sifilis gestacional',
  'Tratamiento sifilis congenita',
  'Clasificacion riesgo metabolico',
  'Fecha trigliceridos',
];

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
  COLUMNS_202.forEach((col, i) => {
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
  return COLUMNS_202.map((col) => {
    if (col.index === 0) return record[col.name] ?? col.defaultValue ?? 2;
    if (col.index === 1) return record[col.name] || idx + 1;
    return resolveFieldValue(record, col);
  });
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

function applyFreezePaneAndFilter(worksheet) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS_202.length },
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
