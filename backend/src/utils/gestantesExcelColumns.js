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

function range(start, end) {
  return `${colLetter(start)}6:${colLetter(end)}6`;
}

const CPN_HEADERS = [
  'FECHA DEL CONTROL', 'EDAD GESTACIONAL', 'PESO', 'IMC', 'ESTADO IMC GESTACIONAL',
  'ALTURA UTERINA (CM)', 'PRESENCIA MOV. FETALES', 'FC FETAL', 'TENSIÓN ARTERIAL',
  'FC GESTANTE', 'CLASIF. RIESGO OBSTÉTRICO', 'CRITERIO ARO', 'SIGNOS DE ALARMA',
  'DX', 'OBSERVACIONES'
];

const CPN_WIDTHS = [14, 12, 8, 8, 15, 12, 12, 8, 14, 10, 15, 15, 18, 15, 20];

const LAB_PAIRS = [
  'HEMOCLASIFICACION', 'HEMOGRAMA (INICIAL)', 'HEMOGRAMA (CONTROL)',
  'TOXOPLASMA IG G', 'TOXOPLASMA IG M', 'CITOMEGALOVIRUS IG G', 'CITOMEGALOVIRUS IG M',
  'RUBEOLA IG G', 'RUBEOLA IG M', 'GLICEMIA BASAL', 'UROCULTIVO', 'PTOG',
  'ESTREPTOCOCO GRUPO B', 'CITOLOGIA CERVICOUTERINA'
];

const LAB_SECOND_COL = [
  'TIPO', 'RESULTADO HB', 'RESULTADO HB',
  'RESULTADO', 'RESULTADO', 'RESULTADO', 'RESULTADO',
  'RESULTADO', 'RESULTADO', 'RESULTADO', 'RESULTADO', 'RESULTADO',
  'RESULTADO', 'RESULTADO'
];

const TAMIZAJE_PAIRS = [
  'HEPATITIS B AG HBs', 'VIH TRIMESTRE I', 'VIH TRIMESTRE II', 'VIH TRIMESTRE III',
  'SEROLOGIA TRIMESTRE I', 'SEROLOGIA TRIMESTRE II', 'SEROLOGIA TRIMESTRE III'
];

export function buildGestantesColumns() {
  const S1 = [
    'No.', 'DEPARTAMENTO DE RESIDENCIA', 'MUNICIPIO DE RESIDENCIA', 'IPS PRIMARIA',
    '1º APELLIDO', '2º APELLIDO', '1º NOMBRE', '2º NOMBRE', 'TIPO ID', 'NUMERO ID',
    'FECHA DE NACIMIENTO', 'ULTIMA CITA DE CONTROL', 'PROGRAMADA PARA', 'EDAD',
    'DIRECCIÓN', 'TELEFONO'
  ];

  const S2 = ['ETNIA', 'ORIENTACION SEXUAL', 'DISCAPACIDAD (SI/NO)', 'TIPO DE DISCAPACIDAD', 'CONDICION DE VULNERABILIDAD'];

  const S3 = [
    'IVE ASESORIA', 'PROCEDIMIENTO IVE', 'FECHA INGRESO A CPN', 'FUM', 'FPP',
    'EDAD GESTACIONAL INGRESO CPN', 'TRIMESTRE INICIO CPN', 'CLASIFICACION RIESGO OBSTETRICO',
    'CAUSA ALTO RIESGO',
    'G', 'P', 'C', 'A', 'V', 'M',
    'PESO EN KG', 'TALLA', 'IMC', 'CLASIFICACION IMC',
    'TA SISTOLICA MM HG', 'TA DIASTOLICA MM HG'
  ];

  const S4 = [
    'SI/NO', 'TAMIZAJE GENETICO', 'DETALLE ANATOMICO',
    'ODONTOLOGIA', 'PSICOLOGIA', 'NUTRICION', 'GINECOLOGIA',
    'Influenza', 'Tetano TD', 'Tdap Acelular', 'COVID-19',
    'Acido Folico', 'Sulfato Ferroso', 'Calcio',
    'FECHA INICIO ASA'
  ];

  const S5_headers = LAB_PAIRS.flatMap((_, i) => ['FECHA', LAB_SECOND_COL[i]]);
  const S6_headers = TAMIZAJE_PAIRS.flatMap(() => ['FECHA', 'RESULTADO']);

  const cpnHeaders = [];
  for (let i = 1; i <= 12; i++) {
    cpnHeaders.push(...CPN_HEADERS);
  }

  const headerRow = [...S1, ...S2, ...S3, ...S4, ...S5_headers, ...S6_headers, ...cpnHeaders];

  const s1Sub = new Array(16).fill('');
  const s2Sub = new Array(5).fill('');
  const s3Sub = [
    '', '', '', '', '', '', '', '', '',
    'ANTECEDENTES GINECOBSTÉTRICOS', '', '', '', '', '',
    'EXAMEN FÍSICO', '', '', '',
    'TENSION ARTERIAL', ''
  ];
  const s4Sub = [
    'INSCRIPCIÓN CURSO MATERNIDAD', 'ECOGRAFIA OBSTETRICA', '',
    'CONSULTAS', '', '', '',
    'VACUNACION', '', '', '',
    'MICRONUTRIENTES', '', '',
    ''
  ];
  const s5Sub = LAB_PAIRS.flatMap(name => [name, '']);
  const s6Sub = TAMIZAJE_PAIRS.flatMap(name => [name, '']);
  const cpnSub = [];
  for (let i = 1; i <= 12; i++) {
    cpnSub.push(`CPN #${i}`, ...new Array(14).fill(''));
  }
  const subGroupRow = [...s1Sub, ...s2Sub, ...s3Sub, ...s4Sub, ...s5Sub, ...s6Sub, ...cpnSub];

  const s1Grp = new Array(16).fill('DATOS DE IDENTIFICACION');
  const s2Grp = new Array(5).fill('ENFOQUE DIFERENCIAL');
  const s3Grp = new Array(21).fill('VALORACION INICIAL DEL RIESGO');
  const s4Grp = new Array(15).fill('ATENCION CONTROL PRENATAL');
  const s5Grp = new Array(28).fill('LABORATORIOS BASICOS');
  const s6Grp = new Array(14).fill('PRUEBAS DE TAMIZAJE');
  const cpnGrp = new Array(180).fill('SEGUIMIENTO A CONTROLES PRENATALES');
  const groupRow = [...s1Grp, ...s2Grp, ...s3Grp, ...s4Grp, ...s5Grp, ...s6Grp, ...cpnGrp];

  const merges = [
    range(1, 16), range(17, 21), range(22, 42), range(43, 57),
    range(58, 85), range(86, 99), range(100, 279),
    'AE7:AJ7', 'AK7:AN7', 'AO7:AP7',
    'AQ7:AQ8', 'AR7:AS7', 'AT7:AW7', 'AX7:BA7', 'BB7:BE7',
  ];

  for (let i = 0; i < LAB_PAIRS.length; i++) {
    const start = 58 + i * 2;
    merges.push(`${colLetter(start)}7:${colLetter(start + 1)}7`);
  }
  for (let i = 0; i < TAMIZAJE_PAIRS.length; i++) {
    const start = 86 + i * 2;
    merges.push(`${colLetter(start)}7:${colLetter(start + 1)}7`);
  }
  for (let i = 0; i < 12; i++) {
    const start = 100 + i * 15;
    merges.push(`${colLetter(start)}7:${colLetter(start + 14)}7`);
  }

  const s1W = [5, 18, 18, 20, 18, 18, 18, 18, 10, 15, 14, 14, 14, 8, 20, 15];
  const s2W = [15, 15, 10, 18, 20];
  const s3W = [10, 12, 14, 14, 14, 15, 12, 18, 20, 10, 10, 10, 10, 10, 10, 10, 10, 10, 15, 14, 14];
  const s4W = [10, 15, 15, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14];
  const labW = new Array(28).fill(0).map((_, i) => i % 2 === 0 ? 14 : 15);
  const tamW = new Array(14).fill(0).map((_, i) => i % 2 === 0 ? 14 : 15);
  const cpnW = [];
  for (let i = 0; i < 12; i++) cpnW.push(...CPN_WIDTHS);
  const widths = [...s1W, ...s2W, ...s3W, ...s4W, ...labW, ...tamW, ...cpnW];

  return { headerRow, subGroupRow, groupRow, merges, widths };
}

export function mapGestantesRow(d, idx) {
  const fixed = [
    idx + 1, 'VALLE', 'CARTAGO', 'TU SALUD EN NUESTRAS MANOS',
    d.primerApellido || '', d.segundoApellido || '', d.primerNombre || '', d.segundoNombre || '',
    d.tipoId || '', d.identificacion || '', d.fechaNacimiento || '',
    d.fechaAtencion || '', '', d.edad || '', d.direccion || '', d.telefono || '',

    '', '', d.discapacidad || '', d.tipoDiscapacidad || '', '',

    d.iveAsesoria || '', '', d.fechaIngresoCPN || '', d.fum || '', d.fpp || '',
    d.edadGestacionalIngreso || '', d.trimestreInicioCPN || '',
    d.clasificacionRiesgo || '', d.causaAltoRiesgo || '',
    d.g || '', d.p || '', d.c || '', d.a || '', d.v || '', d.m || '',
    d.peso || '', d.talla || '', d.imc || '', d.clasificacionIMC || '',
    d.paSistolica || '', d.paDiastolica || '',

    d.cursoMaternidad || '', d.tamizajeGenetico || '', d.detalleAnatomico || '',
    d.consultaOdontologia || '', d.consultaPsicologia || '',
    d.consultaNutricion || '', d.consultaGinecologia || '',
    d.vacInfluenza || '', d.vacTetano || '', d.vacTdap || '', d.vacCovid || '',
    d.acidoFolico || '', d.sulfatoFerroso || '', d.calcio || '',
    d.fechaInicioAsa || '',

    d.hemoclasificacionFecha || '', d.hemoclasificacionTipo || '',
    d.hemogramaInicialFecha || '', d.hemogramaInicialHB || '',
    d.hemogramaControlFecha || '', d.hemogramaControlHB || '',
    d.toxoIgGFecha || '', d.toxoIgGResultado || '',
    d.toxoIgMFecha || '', d.toxoIgMResultado || '',
    d.cmvIgGFecha || '', d.cmvIgGResultado || '',
    d.cmvIgMFecha || '', d.cmvIgMResultado || '',
    d.rubeolaIgGFecha || '', d.rubeolaIgGResultado || '',
    d.rubeolaIgMFecha || '', d.rubeolaIgMResultado || '',
    d.glicemiaFecha || '', d.glicemiaResultado || '',
    d.urocultivoFecha || '', d.urocultivoResultado || '',
    d.ptogFecha || '', d.ptogResultado || '',
    d.estreptococoFecha || '', d.estreptococoResultado || '',
    d.citologiaFecha || '', d.citologiaResultado || '',

    d.hepatitisBFecha || '', d.hepatitisBResultado || '',
    d.vihTrim1Fecha || '', d.vihTrim1Resultado || '',
    d.vihTrim2Fecha || '', d.vihTrim2Resultado || '',
    d.vihTrim3Fecha || '', d.vihTrim3Resultado || '',
    d.serologiaTrim1Fecha || '', d.serologiaTrim1Resultado || '',
    d.serologiaTrim2Fecha || '', d.serologiaTrim2Resultado || '',
    d.serologiaTrim3Fecha || '', d.serologiaTrim3Resultado || ''
  ];

  const cpn = new Array(180).fill('');
  const n = d.cpnNumber;
  if (n >= 1 && n <= 12) {
    const off = (n - 1) * 15;
    const vals = [
      d.fechaAtencion || '', d.edadGestacional || '', d.peso || '', d.imc || '',
      d.clasificacionIMC || '', d.alturaUterina || '', d.movimientosFetales || '',
      d.fcFetal || '', d.tensionArterial || '', d.fcGestante || '',
      d.clasificacionRiesgo || '', d.causaAltoRiesgo || '',
      d.signosAlarma || '', d.diagnostico || '', d.observaciones || ''
    ];
    for (let i = 0; i < 15; i++) cpn[off + i] = vals[i];
  }

  return [...fixed, ...cpn];
}
