function colLetter(idx) {
  let letter = '';
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export function buildPlanificacionFamiliarColumns() {
  const headerRow = [
    'No.', 'DEPARTAMENTO DE RESIDENCIA', 'MUNICIPIO DE RESIDENCIA',
    'IPS PRIMARIA', 'FECHA DE ATENCIÓN            (AAAA-MM-DD)',
    '1º APELLIDO', '2º APELLIDO', '1º NOMBRE', '2º NOMBRE',
    'TIPO ID          (TI, CC, CE)', 'NUMERO ID', 'DIRECCIÓN', 'TELEFONO',
    'SEXO (F/M)', 'EDAD', 'PESO', 'TALLA', 'IMC',
    'MEDICO/ENFERMERA', 'PRIMERA VEZ/CONTROL',
    'POMEROY', 'VASECTOMIA', 'DIU', 'ANOVULATORIOS ORALES',
    'INYECTABLE MENSUAL', 'INYECTABLE TRIMESTRAL',
    'METODO DE BARRERA', 'IMPLANTE SUBDERMICO',
    'FECHA DE ULTIMO CONTROL', 'EFECTO COLATERAL (SI/NO)',
    'ULTIMA CITOLOGIA', 'OBSERVACIONES', 'PROXIMO CONTROL'
  ];

  const groupRow = [
    'BASE DE DATOS DE PLANIFICACION FAMILIAR', '', '', '', '',
    'IDENTIFICACION DEL USUARIO', '', '', '', '', '', '', '',
    'SEXO (F/M)', 'EDAD', 'PESO', 'TALLA', 'IMC',
    'MEDICO/ENFERMERA', 'PRIMERA VEZ/CONTROL',
    'METODOS DE PLANIFICACION', '', '', '', '', '', '', '',
    'FECHA DE ULTIMO CONTROL', 'EFECTO COLATERAL (SI/NO)',
    'ULTIMA CITOLOGIA', 'OBSERVACIONES', 'PROXIMO CONTROL'
  ];

  const totalCols = headerRow.length;
  const merges = [
    `A5:${colLetter(totalCols - 1)}5`,
    'A6:E6',
    'F6:M6',
    'U6:AB6'
  ];

  [13, 14, 15, 16, 17, 18, 19, 28, 29, 30, 31, 32].forEach(i => {
    merges.push(`${colLetter(i)}6:${colLetter(i)}7`);
  });

  const widths = [
    5, 18, 18, 14, 16,
    18, 18, 18, 18, 12, 16, 30, 14,
    8, 8, 8, 8, 8,
    18, 18,
    12, 12, 8, 20, 18, 20, 18, 20,
    20, 18, 18, 25, 18
  ];

  return { headerRow, groupRow, merges, widths };
}

export function mapPlanificacionFamiliarRow(d, idx) {
  return [
    idx + 1, 'VALLE', 'CARTAGO', 'TU SALUD',
    d.fecha || '',
    d.primerApellido || '', d.segundoApellido || '',
    d.primerNombre || '', d.segundoNombre || '',
    d.tipoIdentificacion || '', d.numeroIdentificacion || '',
    d.direccionResidencia || '', d.telefonos || '',
    d.sexo || '', d.edad || '',
    d.pesoKg ?? '', d.tallaCm ?? '', d.imc ?? '',
    d.medicoEnfermera || '', d.visitType || '',
    d.pomeroy || '', d.vasectomia || '', d.diu || '',
    d.anovulatoriosOrales || '', d.inyectableMensual || '',
    d.inyectableTrimestral || '', d.metodoBarrera || '',
    d.implanteSubdermico || '',
    d.fechaUltimoControl || '', d.efectoColateral || '',
    d.ultimaCitologia || '', d.observaciones || '',
    d.proximoControl || ''
  ];
}
