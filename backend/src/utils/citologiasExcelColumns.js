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

export function buildCitologiasColumns() {
  const headerRow = [
    '#', 'PRIMER APELLIDO', 'SEGUNDO APELLIDO', 'PRIMER NOMBRE', 'SEGUNDO NOMBRE',
    'TI', 'CC', 'CE', 'PT', 'OTRO',
    'DOCUMENTO DE IDENTIDAD', 'AAAA/MM/DD', 'EDAD (ANOS)', 'PESO', 'TALLA',
    'DIRECCION RESIDENCIA', 'TELEFONOS',
    'OCUPACION', 'ESCOLARIDAD',
    '(AAAA/MM/DD)', '1 VEZ', 'CONTROL', 'REPETIDA', 'GESTANTE (EDAD GESTACIONAL)',
    '(AAAA/MM/DD)', 'NEGATIVA', 'POSITIVA (ESCRIBIR NIC)', 'ASCUS', 'INADECUADA',
    'NO', 'SI', 'CUAL?',
    'USO DE METODO DE PLANIFICACION FAMILIAR (INYECTABLE, ACOS, IMPLANTE SUBDERMICO, DIU, POMEROY, NINGUNO, ETC)',
    'AAAA/MM/DD', 'AAAA/MM/DD',
    'NEGATIVA', 'POSITIVA (Escribir NIC)', 'ASCUS', 'OBSERVACIONES', 'INADECUADA',
    'AAAA/MM/DD', 'COMO? (LLAMADA, VISITA DOMICILIARIA, CITA DE CONTROL)', 'OBSERVACION',
    'AAAA/MM/DD', 'COMO? (LLAMADA, VISITA DOMICILIARIA, CITA DE CONTROL)', 'OBSERVACION',
    'AAAA/MM/DD', 'COMO? (LLAMADA, VISITA DOMICILIARIA, CITA DE CONTROL)', 'OBSERVACION',
    'AAAA/MM/DD', 'COMO? (LLAMADA, VISITA DOMICILIARIA, CITA DE CONTROL)', 'OBSERVACION',
    'OBSERVACIONES GENERALES'
  ];

  const subGroupRow = [
    '#', 'PRIMER APELLIDO', 'SEGUNDO APELLIDO', 'PRIMER NOMBRE', 'SEGUNDO NOMBRE',
    'TIPO DE DOCUMENTO', '', '', '', '',
    'DOCUMENTO DE IDENTIDAD', 'FECHA DE NACIMIENTO', 'EDAD (ANOS)', 'PESO', 'TALLA',
    'DIRECCION RESIDENCIA', 'TELEFONOS',
    'OCUPACION', 'ESCOLARIDAD',
    'FECHA ULTIMA MENSTRUACION', 'CITOLOGIA', '', '', '',
    'FECHA ULTIMA CITOLOGIA', 'RESULTADO', '', '', '',
    'LE HAN REALIZADO PROCEDIMIENTOS EN EL CUELLO UTERINO', '', '',
    'USO DE METODO DE PLANIFICACION FAMILIAR',
    'FECHA TOMA CITOLOGIA', 'FECHA DEL REPORTE',
    'RESULTADO', '', '', '', '',
    'FECHA', 'COMO?', 'OBSERVACION',
    'FECHA', 'COMO?', 'OBSERVACION',
    'FECHA', 'COMO?', 'OBSERVACION',
    'FECHA', 'COMO?', 'OBSERVACION',
    'OBSERVACIONES GENERALES'
  ];

  const groupRow = [
    'DATOS PERSONALES', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    '', '',
    'ANAMNESIS', '', '', '', '', '', '', '', '', '', '', '', '', '',
    'CITOLOGIA', '', '', '', '', '', '',
    'SEGUIMIENTO 1', '', '',
    'SEGUIMIENTO 2', '', '',
    'SEGUIMIENTO 3', '', '',
    'SEGUIMIENTO 4', '', '',
    'OBSERVACIONES GENERALES'
  ];

  const merges = [
    'A6:Q6',
    'T6:AG6',
    'AH6:AN6',
    'AO6:AQ6',
    'AR6:AT6',
    'AU6:AW6',
    'AX6:AZ6',
    'R6:R8',
    'S6:S8',
    'BA6:BA8',
    'F7:J7',
    'U7:X7',
    'Z7:AC7',
    'AD7:AF7',
    'AJ7:AN7',
    'A7:A8',
    'B7:B8',
    'C7:C8',
    'D7:D8',
    'E7:E8',
    'K7:K8',
    'L7:L8',
    'M7:M8',
    'N7:N8',
    'O7:O8',
    'P7:P8',
    'Q7:Q8',
    'T7:T8',
    'Y7:Y8',
    'AG7:AG8',
    'AH7:AH8',
    'AI7:AI8',
    'AO7:AO8',
    'AP7:AP8',
    'AQ7:AQ8',
    'AR7:AR8',
    'AS7:AS8',
    'AT7:AT8',
    'AU7:AU8',
    'AV7:AV8',
    'AW7:AW8',
    'AX7:AX8',
    'AY7:AY8',
    'AZ7:AZ8'
  ];

  const widths = [
    5, 18, 18, 18, 18,
    5, 5, 5, 5, 5,
    15, 14, 8, 8, 8,
    30, 15,
    18, 18,
    14, 8, 8, 8, 15,
    14, 10, 15, 8, 12,
    5, 5, 25,
    30,
    14, 14,
    10, 15, 8, 18, 12,
    14, 25, 18,
    14, 25, 18,
    14, 25, 18,
    14, 25, 18,
    25
  ];

  return { headerRow, subGroupRow, groupRow, merges, widths };
}

export function mapCitologiasRow(d, idx) {
  const docType = (d.docType || 'CC').toUpperCase();
  return [
    idx + 1,
    d.primerApellido || '',
    d.segundoApellido || '',
    d.primerNombre || '',
    d.segundoNombre || '',
    docType === 'TI' ? 'X' : '',
    docType === 'CC' ? 'X' : '',
    docType === 'CE' ? 'X' : '',
    docType === 'PT' ? 'X' : '',
    !['TI', 'CC', 'CE', 'PT'].includes(docType) ? 'X' : '',
    d.identificacion || '',
    d.fechaNacimiento || '',
    d.edad || '',
    d.peso || '',
    d.talla || '',
    d.direccion || '',
    d.telefono || '',
    d.ocupacion || '',
    d.escolaridad || '',
    d.fum || '',
    d.primeraVez || '',
    d.control || '',
    d.repetida || '',
    d.gestante || '',
    d.fechaUltimaCitologia || '',
    d.negativa || '',
    d.positiva || '',
    d.ascus || '',
    d.inadecuada || '',
    d.no || '',
    d.si || '',
    d.cual || '',
    d.metodoPlanificacion || '',
    d.fechaTomaCitologia || '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ];
}
