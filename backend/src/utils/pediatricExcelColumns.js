function commonRow5() {
  return [
    'No', 'FECHA', 'TIPO DE INSCRIPCION', '', 'MEDICO/ENFERMERA',
    'PRIMER APELLIDO', 'SEGUNDO APELLIDO', 'PRIMER NOMBRE', 'SEGUNDO NOMBRE',
    'TIPO DE IDENTIFICACION', 'NUMERO DE IDENTIFICACION',
    'DIRECCION RESIDENCIA', 'TELEFONOS', 'NOMBRE DEL ACUDIENTE',
    'FECHA NACIMIENTO', 'EDAD EN LA CONSULTA', 'SEXO',
    'PESO (Kg)', 'TALLA (Cm)', 'IMC (Kg/m2)'
  ];
}

function commonRow6Start() {
  return [
    '', 'AAAA-MM-DD', '1a VEZ', 'CONTROL', '',
    '', '', '', '',
    '', '',
    '', '', '',
    'AAAA-MM-DD', '', '',
    '', '', ''
  ];
}

function postVitalsRow5() {
  return [
    'ESTADO NUTRICIONAL',
    'ETNIA (MESTIZO, AFRO, INDIGENA)',
    'VICTIMA DE MALTRATO (SI / NO)',
    'VICTIMA DE VIOLENCIA SEXUAL (SI / NO)',
    'SINTOMATICO RESPIRATORIO (SI / NO)',
    'DISCAPACIDAD', '', '',
    'ESQUEMA VACUNAL (COMPLETO / INCOMPLETO)',
    'REMISION'
  ];
}

function postVitalsRow6() {
  return [
    '', '', '', '', '',
    'MOTORA (SI/NO)', 'SINDROMES (SI/NO)', 'VISUAL/AUDITIVA (SI/NO)',
    '', 'RUTA DE ATENCION A LA DNT (SI/NO)'
  ];
}

function vaccineRow5(count) {
  const arr = ['VACUNACION'];
  for (let i = 1; i < count; i++) arr.push('');
  return arr;
}

const COMMON_MERGES = [
  'C5:D5',
  'A5:A6', 'B5:B6', 'E5:E6',
  'F5:F6', 'G5:G6', 'H5:H6', 'I5:I6',
  'J5:J6', 'K5:K6', 'L5:L6', 'M5:M6', 'N5:N6',
  'O5:O6', 'P5:P6', 'Q5:Q6', 'R5:R6', 'S5:S6', 'T5:T6'
];

const COMMON_WIDTHS = [
  5, 14, 10, 10, 20,
  18, 18, 18, 18,
  12, 20, 35, 15, 25,
  14, 18, 8, 10, 10, 12
];

const POST_VITALS_WIDTHS = [16, 20, 20, 22, 20, 14, 14, 16, 14];

const VACCINE_COL_WIDTH = 12;

export function buildPrimeraInfanciaColumns() {
  const row5 = [
    ...commonRow5(),
    'PERIMETRO CEFALICO DE 0-5 ANOS',
    'PERIMETRO BRAQUIAL 6 MESES HASTA LOS 4 ANOS Y 11 MESES',
    'PERIMETRO ABDOMINAL DE 0-18 ANOS',
    ...postVitalsRow5(),
    'MICRONUTRIENTES', '', '',
    'DESPARASITANTE', 'OBSERVACIONES',
    ...vaccineRow5(10),
    'PROXIMO CONTROL'
  ];

  const row6 = [
    ...commonRow6Start(),
    '', '', '',
    ...postVitalsRow6(),
    'VITAMINA A', 'HIERRO', 'ZINC',
    '', '',
    'RN', '2M', '4M', '6M', '7M', '12M', '18M', '5 ANOS', '9 ANOS', 'COVID-19',
    ''
  ];

  const merges = [
    ...COMMON_MERGES,
    'U5:U6', 'V5:V6', 'W5:W6',
    'X5:X6', 'Y5:Y6', 'Z5:Z6', 'AA5:AA6', 'AB5:AB6',
    'AC5:AE5', 'AF5:AF6',
    'AH5:AJ5', 'AK5:AK6', 'AL5:AL6',
    'AM5:AV5', 'AW5:AW6'
  ];

  const widths = [
    ...COMMON_WIDTHS, 20, 25, 22,
    ...POST_VITALS_WIDTHS, 14, 14, 14,
    14, 25,
    ...new Array(10).fill(VACCINE_COL_WIDTH), 25
  ];

  return { row5, row6, merges, widths };
}

export function buildInfanciaColumns() {
  const row5 = [
    ...commonRow5(),
    'PERIMETRO ABDOMINAL DE 0-18 ANOS',
    ...postVitalsRow5(),
    'DESPARASITANTE', 'OBSERVACIONES',
    ...vaccineRow5(10),
    'PROXIMO CONTROL'
  ];

  const row6 = [
    ...commonRow6Start(),
    '',
    ...postVitalsRow6(),
    '', '',
    'RN', '2M', '4M', '6M', '7M', '12M', '18M', '5 ANOS', '9 ANOS', 'COVID-19',
    ''
  ];

  const merges = [
    ...COMMON_MERGES, 'U5:U6',
    'V5:V6', 'W5:W6', 'X5:X6', 'Y5:Y6', 'Z5:Z6',
    'AA5:AC5', 'AD5:AD6',
    'AF5:AF6', 'AG5:AG6',
    'AH5:AQ5', 'AR5:AR6'
  ];

  const widths = [
    ...COMMON_WIDTHS, 22,
    ...POST_VITALS_WIDTHS, 14,
    14, 25,
    ...new Array(10).fill(VACCINE_COL_WIDTH), 25
  ];

  return { row5, row6, merges, widths };
}

export function buildAdolescenciaColumns() {
  const row5 = [
    ...commonRow5(),
    'PERIMETRO ABDOMINAL DE 0-18 ANOS',
    ...postVitalsRow5(),
    'DESPARASITANTE', 'OBSERVACIONES',
    ...vaccineRow5(11),
    'PROXIMO CONTROL'
  ];

  const row6 = [
    ...commonRow6Start(),
    '',
    ...postVitalsRow6(),
    '', '',
    'RN', '2M', '4M', '6M', '7M', '12M', '18M', '5 ANOS', '9 ANOS', '15 ANOS', 'COVID-19',
    ''
  ];

  const merges = [
    ...COMMON_MERGES, 'U5:U6',
    'V5:V6', 'W5:W6', 'X5:X6', 'Y5:Y6', 'Z5:Z6',
    'AA5:AC5', 'AD5:AD6',
    'AF5:AF6', 'AG5:AG6',
    'AH5:AR5', 'AS5:AS6'
  ];

  const widths = [
    ...COMMON_WIDTHS, 22,
    ...POST_VITALS_WIDTHS, 14,
    14, 25,
    ...new Array(11).fill(VACCINE_COL_WIDTH), 25
  ];

  return { row5, row6, merges, widths };
}

function commonDataValues(d, idx) {
  return [
    idx + 1, d.fecha || '',
    d.tipoInscripcion1aVez || '', d.tipoInscripcionControl || '',
    d.medicoEnfermera || '',
    d.primerApellido || '', d.segundoApellido || '',
    d.primerNombre || '', d.segundoNombre || '',
    d.tipoIdentificacion || '', d.numeroIdentificacion || '',
    d.direccionResidencia || '', d.telefonos || '',
    d.acudiente || '', d.fechaNacimiento || '',
    d.edadConsulta || '', d.sexo || '',
    d.pesoKg ?? '', d.tallaCm ?? '', d.imc ?? ''
  ];
}

function postVitalsValues(d) {
  return [
    d.estadoNutricional || '', d.etnia || 'MESTIZO',
    d.victimaMaltrato || 'NO', d.victimaViolenciaSexual || 'NO',
    d.sintomaticoRespiratorio || 'NO',
    d.discapacidadMotora || 'NO', d.discapacidadSindromes || 'NO',
    d.discapacidadVisualAuditiva || 'NO',
    d.esquemaVacunal || '', d.remisionDnt || 'NO'
  ];
}

function standardVaccineValues(d) {
  return [
    d.vacunaRN || '', d.vacuna2M || '', d.vacuna4M || '',
    d.vacuna6M || '', d.vacuna7M || '', d.vacuna12M || '',
    d.vacuna18M || '', d.vacuna5A || '', d.vacuna9A || '',
    d.vacunaCovid || ''
  ];
}

export function mapPrimeraInfanciaRow(d, idx) {
  return [
    ...commonDataValues(d, idx),
    d.perimetroCefalico ?? '', d.perimetroBraquial ?? '',
    d.perimetroAbdominal ?? '',
    ...postVitalsValues(d),
    d.vitaminaA || '', d.hierro || '', d.zinc || '',
    d.desparasitante || '', d.observaciones || '',
    ...standardVaccineValues(d),
    d.proximoControl || ''
  ];
}

export function mapInfanciaRow(d, idx) {
  return [
    ...commonDataValues(d, idx),
    d.perimetroAbdominal ?? '',
    ...postVitalsValues(d),
    d.desparasitante || '', d.observaciones || '',
    ...standardVaccineValues(d),
    d.proximoControl || ''
  ];
}

export function mapAdolescenciaRow(d, idx) {
  return [
    ...commonDataValues(d, idx),
    d.perimetroAbdominal ?? '',
    ...postVitalsValues(d),
    d.desparasitante || '', d.observaciones || '',
    d.vacunaRN || '', d.vacuna2M || '', d.vacuna4M || '',
    d.vacuna6M || '', d.vacuna7M || '', d.vacuna12M || '',
    d.vacuna18M || '', d.vacuna5A || '', d.vacuna9A || '',
    d.vacuna15A || '', d.vacunaCovid || '',
    d.proximoControl || ''
  ];
}
