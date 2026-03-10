function commonHeaders(programa) {
  const tipoId = programa === 'juventud'
    ? 'TIPO ID          (TI, CC, CE, PE)'
    : 'TIPO ID          (CC, CE, PE)';
  const fechaLabel = programa === 'vejez'
    ? 'FECHA DE ATENCIÓN (AAAA-MM-DD)'
    : 'FECHA DE ATENCIÓN (A-M-D)';

  return [
    'No.', 'DEPARTAMENTO DE RESIDENCIA', 'MUNICIPIO DE RESIDENCIA',
    'IPS PRIMARIA', fechaLabel,
    '1º APELLIDO', '2º APELLIDO', '1º NOMBRE', '2º NOMBRE',
    tipoId, 'NUMERO ID', 'DIRECCIÓN', 'TELEFONO',
    'EDAD', 'SEXO (F/M)', 'ORIENTACION SEXUAL', 'IDENTIDAD DE GENERO',
    'ANTECEDENTES FAMILIARES', 'ANTECEDENTES PERSONALES', 'DISCAPACIDAD',
    'CONSUMO DE SUSTANCIAS PSICOACTIVAS', 'CONSUMO DE TABACO', 'CONSUMO DE ALCOHOL',
    'PESO (KG)', 'TALLA (CM)', 'IMC', 'CLASIFICACION DEL IMC'
  ];
}

function commonGroupRow() {
  return [
    '', '', '', '', '',
    'IDENTIFICACION DEL USUARIO', '', '', '', '', '', '', '',
    '', 'SEXO (F/M)', 'ORIENTACION SEXUAL', 'IDENTIDAD DE GENERO',
    'ANTECEDENTES FAMILIARES', 'ANTECEDENTES PERSONALES', 'DISCAPACIDAD',
    'SITUACION PERSONAL', '', '',
    'EXAMEN FISICO', '', '', ''
  ];
}

function juventudLabHeaders() {
  return [
    'FECHA LABORATORIOS TOMADOS', 'HEMOGRAMA',
    'FECHA LABORATORIOS TOMADOS', 'HDL (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'LDL (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'COLESTEROL TOTAL (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'TRIGLICERIDOS (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'GLICEMIA (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'CREATININA (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'UROANALISIS (PATOLOGICO/NO PATOLOGICO',
    'FECHA LABORATORIOS TOMADOS', 'PRUEBA RAPIDA SIFILIS (REACTIVO/NO REACTIVO)',
    'FECHA LABORATORIOS TOMADOS', 'VIH  (REACTIVO/NO REACTIVO)'
  ];
}

function adultezLabHeaders() {
  return [
    'FECHA LABORATORIOS TOMADOS', 'HEMOGRAMA',
    'FECHA LABORATORIOS TOMADOS', 'HDL (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'LDL (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'COLESTEROL TOTAL (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'TRIGLICERIDOS (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'GLICEMIA (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'CREATININA (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'UROANALISIS (PATOLOGICO/NO PATOLOGICO)',
    'FECHA LABORATORIOS TOMADOS', 'PRUEBA RAPIDA SIFILIS (REACTIVO/NO REACTIVO)',
    'FECHA LABORATORIOS TOMADOS', 'VIH (REACTIVO/NO REACTIVO)',
    'FECHA LABORATORIOS TOMADOS', 'PSA HOMBRES (DE 50 AÑOS EN ADELANTE) (NG/ML)<4,0',
    'FECHA LABORATORIOS TOMADOS', 'SANGRE OCULTA EN HECES HOMBRES Y MUJERES (50-75 AÑOS) POSITIVO/NEGATIVO'
  ];
}

function vejezLabHeaders() {
  return [
    'FECHA LABORATORIOS TOMADOS', 'HEMOGRAMA',
    'FECHA LABORATORIOS TOMADOS', 'HDL  (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'LDL  (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'COLESTEROL TOTAL  (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'TRIGLICERIDOS  (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'GLICEMIA  (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'CREATININA  (MG/DL)',
    'FECHA LABORATORIOS TOMADOS', 'UROANALISIS (PATOLOGICO/NO PATOLOGICO)',
    'FECHA LABORATORIOS TOMADOS', 'PRUEBA RAPIDA SIFILIS (REACTIVO/NO REACTIVO)',
    'FECHA LABORATORIOS TOMADOS', 'VIH  (REACTIVO/NO REACTIVO)',
    'FECHA LABORATORIOS TOMADOS', 'PSA HOMBRES (DE 50 AÑOS EN ADELANTE) (NG/ML)<4,0',
    'FECHA LABORATORIOS TOMADOS', 'SANGRE OCULTA EN HECES HOMBRES Y MUJERES (50-75 AÑOS) POSITIVO/NEGATIVO'
  ];
}

function commonWidths() {
  return [
    5, 18, 18, 14, 16,
    18, 18, 18, 18,
    12, 16, 30, 14,
    12, 8, 16, 16,
    30, 25, 16,
    20, 16, 16,
    10, 10, 8, 18
  ];
}

function labWidths(count) {
  const widths = [];
  for (let i = 0; i < count; i++) {
    widths.push(i % 2 === 0 ? 16 : 20);
  }
  return widths;
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

function buildMerges(totalCols, examFisicoCols, labStart) {
  const merges = [];
  merges.push(`A5:${colLetter(totalCols - 1)}5`);
  merges.push('A6:E6');
  merges.push('F6:M6');
  merges.push('U6:W6');
  const examEnd = 23 + examFisicoCols - 1;
  merges.push(`X6:${colLetter(examEnd)}6`);
  merges.push(`${colLetter(labStart)}6:${colLetter(labStart + 19)}6`);

  [14, 15, 16, 17, 18, 19].forEach(i => {
    merges.push(`${colLetter(i)}6:${colLetter(i)}7`);
  });

  return merges;
}

export function buildJuventudColumns() {
  const labs = juventudLabHeaders();
  const headerRow = [
    ...commonHeaders('juventud'),
    'TENSION ARTERIAL',
    'PLANIFICACION FAMILIAR (METODO)', 'FECHA ULTIMA CITOLOGIA',
    ...labs,
    'OBSERVACIONES'
  ];

  const groupRow = [
    ...commonGroupRow(), '',
    '', '',
    ...new Array(labs.length).fill(''),
    ''
  ];

  const widths = [
    ...commonWidths(), 16,
    22, 18,
    ...labWidths(labs.length),
    25
  ];

  return { headerRow, groupRow, merges: buildMerges(headerRow.length, 5, 30), widths };
}

export function buildAdultezColumns() {
  const labs = adultezLabHeaders();
  const headerRow = [
    ...commonHeaders('adultez'),
    'PERIMETRO ABDOMINAL', 'TENSION ARTERIAL',
    'PLANIFICACION FAMILIAR (METODO)', 'FECHA ULTIMA CITOLOGIA',
    'FECHA ULTIMA MAMOGRAFIA', 'TACTO RECTAL (SI/NO/NO APLICA)',
    ...labs,
    'OBSERVACIONES'
  ];

  const groupRow = [
    ...commonGroupRow(), '', '',
    '', '', '', '',
    ...new Array(labs.length).fill(''),
    ''
  ];

  const widths = [
    ...commonWidths(), 18, 16,
    22, 18, 20, 22,
    ...labWidths(labs.length),
    25
  ];

  return { headerRow, groupRow, merges: buildMerges(headerRow.length, 6, 33), widths };
}

export function buildVejezColumns() {
  const labs = vejezLabHeaders();
  const headerRow = [
    ...commonHeaders('vejez'),
    'PERIMETRO ABDOMINAL', 'TENSION ARTERIAL',
    'PLANIFICACION FAMILIAR (METODO)', 'FECHA ULTIMA CITOLOGIA',
    'TACTO RECTAL (SI/NO/NO APLICA)',
    ...labs,
    'OBSERVACIONES'
  ];

  const groupRow = [
    ...commonGroupRow(), '', '',
    '', '', '',
    ...new Array(labs.length).fill(''),
    ''
  ];

  const widths = [
    ...commonWidths(), 18, 16,
    22, 18, 22,
    ...labWidths(labs.length),
    25
  ];

  return { headerRow, groupRow, merges: buildMerges(headerRow.length, 6, 32), widths };
}

function commonDataValues(d, idx) {
  return [
    idx + 1, 'VALLE', 'CARTAGO', 'IPS TU SALUD',
    d.fecha || '',
    d.primerApellido || '', d.segundoApellido || '',
    d.primerNombre || '', d.segundoNombre || '',
    d.tipoIdentificacion || '', d.numeroIdentificacion || '',
    d.direccionResidencia || '', d.telefonos || '',
    d.edadConsulta || '', d.sexo || '',
    d.orientacionSexual || '', d.identidadGenero || '',
    d.antecedentesFamiliares || '', d.antecedentesPersonales || '',
    d.discapacidad || '',
    d.consumoSustancias || 'NO', d.consumoTabaco || 'NO', d.consumoAlcohol || 'NO',
    d.pesoKg ?? '', d.tallaCm ?? '', d.imc ?? '',
    d.clasificacionImc || ''
  ];
}

function labValues(d) {
  return [
    d.fechaLabHemograma || '-', d.hemograma ?? '-',
    d.fechaLabHdl || '-', d.hdl ?? '-',
    d.fechaLabLdl || '-', d.ldl ?? '-',
    d.fechaLabCt || '-', d.colesterolTotal ?? '-',
    d.fechaLabTg || '-', d.trigliceridos ?? '-',
    d.fechaLabGlucosa || '-', d.glucosa ?? '-',
    d.fechaLabCreatinina || '-', d.creatinina ?? '-',
    d.fechaLabUroanalisis || '-', d.uroanalisis || '-',
    d.fechaLabSifilis || '-', d.sifilis || '-',
    d.fechaLabVih || '-', d.vih || '-'
  ];
}

function extendedLabValues(d) {
  return [
    ...labValues(d),
    d.fechaLabPsa || '-', d.psa ?? '-',
    d.fechaLabSangreOculta || '-', d.sangreOculta || '-'
  ];
}

export function mapJuventudRow(d, idx) {
  return [
    ...commonDataValues(d, idx),
    d.tensionArterial || '',
    d.planificacionFamiliar || 'NINGUNO', d.fechaCitologia || 'NA',
    ...labValues(d),
    d.observaciones || ''
  ];
}

export function mapAdultezRow(d, idx) {
  return [
    ...commonDataValues(d, idx),
    d.perimetroAbdominal || '-', d.tensionArterial || '',
    d.planificacionFamiliar || 'NINGUNO', d.fechaCitologia || 'NA',
    d.fechaMamografia || 'NA', d.tactoRectal || 'NO APLICA',
    ...extendedLabValues(d),
    d.observaciones || ''
  ];
}

export function mapVejezRow(d, idx) {
  return [
    ...commonDataValues(d, idx),
    d.perimetroAbdominal || '-', d.tensionArterial || '',
    d.planificacionFamiliar || 'NINGUNO', d.fechaCitologia || 'NA',
    d.tactoRectal || 'NO APLICA',
    ...extendedLabValues(d),
    d.observaciones || ''
  ];
}
