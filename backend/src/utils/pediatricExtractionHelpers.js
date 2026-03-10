const VACCINE_MILESTONES = [
  'RECIEN NACIDO', '2 MESES', '4 MESES', '6 MESES',
  '7 MESES', '12 MESES', '18 MESES', '5 AÑOS', '9 AÑOS'
];

const VACCINE_MILESTONE_ADOLESCENCIA = [...VACCINE_MILESTONES, '15 AÑOS'];

const MILESTONE_KEY_MAP = {
  'RECIEN NACIDO': 'vacunaRN', '2 MESES': 'vacuna2M',
  '4 MESES': 'vacuna4M', '6 MESES': 'vacuna6M',
  '7 MESES': 'vacuna7M', '12 MESES': 'vacuna12M',
  '18 MESES': 'vacuna18M', '5 AÑOS': 'vacuna5A',
  '9 AÑOS': 'vacuna9A', '15 AÑOS': 'vacuna15A'
};

const VACCINE_ALIASES = {
  'RECIEN NACIDO': ['RECI[EÉ]N\\s+NACIDO', 'RN'],
  '2 MESES': ['2\\s+MESES?', '2M'],
  '4 MESES': ['4\\s+MESES?', '4M'],
  '6 MESES': ['6\\s+MESES?', '6M'],
  '7 MESES': ['7\\s+MESES?', '7M'],
  '12 MESES': ['12\\s+MESES?', '12M'],
  '18 MESES': ['18\\s+MESES?', '18M'],
  '5 AÑOS': ['5\\s+A[ÑN]OS?'],
  '9 AÑOS': ['9\\s+A[ÑN]OS?'],
  '15 AÑOS': ['15\\s+A[ÑN]OS?']
};

export function extractNutritionalStatus(text, vitals) {
  const explicit = text.match(
    /ESTADO NUTRICIONAL[:\s]+(ADECUADO|SOBREPESO|OBESIDAD|RIESGO DE DELGADEZ|DESNUTRICI[OÓ]N|NORMAL|BAJO PESO)/i
  );
  if (explicit) {
    const val = explicit[1].toUpperCase();
    return val === 'NORMAL' ? 'ADECUADO' : val;
  }

  if (/(?:SIN OBESIDAD,?\s*SIN SOBREPESO\s*O?\s*BAJO PESO)/i.test(text)) return 'ADECUADO';
  if (/ADECUADO ESTADO NUTRICIONAL/i.test(text)) return 'ADECUADO';
  if (/CUMPLE LOS PATRONES DE CRECIMIENTO/i.test(text)) return 'ADECUADO';
  if (/SIN OBESIDAD.*SIN SOBREPESO/i.test(text)) return 'ADECUADO';
  if (/PERCENTILES?\s+(?:ADECUADOS?|NORMALES?)/i.test(text)) return 'ADECUADO';
  if (/CRECIMIENTO\s+(?:ADECUADO|NORMAL)/i.test(text)) return 'ADECUADO';

  if (/PERCENTILES?\s+BAJOS?\s+PARA\s+PESO/i.test(text)) return 'RIESGO DE DELGADEZ';
  if (/PESO\s+(?:Y\s+TALLA\s+)?BAJ[OA]/i.test(text)) return 'RIESGO DE DELGADEZ';
  if (/RIESGO\s+DE\s+(?:DELGADEZ|DESNUTRICI)/i.test(text)) return 'RIESGO DE DELGADEZ';

  if (vitals.imc) {
    if (vitals.imc >= 28) return 'OBESIDAD';
    if (vitals.imc >= 23) return 'SOBREPESO';
    if (vitals.imc < 14) return 'RIESGO DE DELGADEZ';
  }

  return 'ADECUADO';
}

export function extractClinicalFlags(text) {
  const maltratoDetectado = /SEÑALES DE MALTRATO/i.test(text)
    && !/NO HAY SEÑALES DE MALTRATO/i.test(text)
    && !/SIN SIGNOS DE MALTRATO/i.test(text);

  const violenciaDetectada = /VIOLENCIA\s+SEXUAL\s+SI/i.test(text)
    || (/V[IÍ]CTIMA\s+DE\s+VIOLENCIA\s+SEXUAL/i.test(text)
      && !/NO\s+(?:ES\s+)?V[IÍ]CTIMA/i.test(text));

  const respMatch = text.match(/SINTOM[AÁ]TICO\s+RESPIRATORIO[:\s]+(SI|NO)/i);
  const esResp = respMatch ? respMatch[1].toUpperCase() === 'SI' : false;

  const noDiscapacidad = /NO APLICA/i.test(
    (text.match(/Tipo de discapacidad:\s*([^\n]+)/i) || [])[1] || ''
  );
  const motoraM = text.match(/(?:MOTORA|MOTRIZ)[:\s]+(SI|NO)/i);
  const sindromesM = text.match(/S[IÍ]NDROMES?[:\s]+(SI|NO)/i);
  const visualM = text.match(/VISUAL\s*(?:\/|Y)\s*AUDITIVA[:\s]+(SI|NO)/i);

  return {
    victimaMaltrato: maltratoDetectado ? 'SI' : 'NO',
    victimaViolenciaSexual: violenciaDetectada ? 'SI' : 'NO',
    sintomaticoRespiratorio: esResp ? 'SI' : 'NO',
    discapacidadMotora: motoraM ? motoraM[1].toUpperCase() : (noDiscapacidad ? 'NO' : ''),
    discapacidadSindromes: sindromesM ? sindromesM[1].toUpperCase() : (noDiscapacidad ? 'NO' : ''),
    discapacidadVisualAuditiva: visualM ? visualM[1].toUpperCase() : (noDiscapacidad ? 'NO' : ''),
    remisionDnt: /RUTA DE ATENCI[OÓ]N.*DNT[:\s]+SI/i.test(text) ? 'SI' : 'NO'
  };
}

export function extractVaccineStatus(text) {
  if (/VACUNACI[OÓ]N\s+INCOMPLETO/i.test(text)) return 'INCOMPLETO';
  if (/ESQUEMA\s+(?:DE\s+)?VACUNACI[OÓ]N\s+INCOMPLETO/i.test(text)) return 'INCOMPLETO';
  if (/FALTA\s+VACUNACI?[OÓ]N/i.test(text)) return 'INCOMPLETO';
  if (/PENDIENTE\s+(?:COLOCARSE|VACUN|APLICAR|COMPLETAR)/i.test(text)) return 'INCOMPLETO';
  if (/ESQUEMA\s+(?:DE\s+)?VACUNACI[OÓ]N\s+(?:COMPLETO|ADECUADO)/i.test(text)) return 'COMPLETO';
  if (/VACUNACION\s+COMPLETO/i.test(text)) return 'COMPLETO';
  return 'COMPLETO';
}

export function extractVaccinationDates(text, programa) {
  const data = {};
  const milestones = programa === 'adolescencia'
    ? VACCINE_MILESTONE_ADOLESCENCIA
    : VACCINE_MILESTONES;

  for (const milestone of milestones) {
    const key = MILESTONE_KEY_MAP[milestone] || milestone;
    const patterns = VACCINE_ALIASES[milestone] || [milestone.replace(/\s+/g, '\\s+')];
    let found = false;

    for (const pattern of patterns) {
      const match = text.match(new RegExp(`${pattern}[:\\s]+([\\d]{2}/[\\d]{2}/[\\d]{4})`, 'i'));
      if (match) {
        data[key] = convertVaccineDate(match[1]);
        found = true;
        break;
      }
    }

    if (!found) {
      for (const pattern of patterns) {
        if (new RegExp(`${pattern}[:\\s]+NO\\s+TIENE`, 'i').test(text)) {
          found = true;
          break;
        }
      }
    }

    if (!found) data[key] = '';
    else if (!data[key]) data[key] = '';
  }

  data.vacunaCovid = '';
  const covid = text.match(/COVID[:\s-]*19[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
  if (covid) data.vacunaCovid = convertVaccineDate(covid[1]);

  return data;
}

export function extractMicronutrients(text, programa) {
  if (programa !== 'primera-infancia') return {};
  return {
    vitaminaA: extractSiNo(text, /VITAMINA\s+A[:\s]+(SI|NO)/i),
    hierro: extractSiNo(text, /HIERRO[:\s]+(SI|NO)/i),
    zinc: extractSiNo(text, /ZINC[:\s]+(SI|NO)/i)
  };
}

export function extractDesparasitante(text) {
  if (/(?:FORMULA|SE\s+FORMULA)\s+DESPARASITANTE/i.test(text)) return 'SI';
  if (/ALBENDAZOL|MEBENDAZOL|NITAZOXANIDA|IVERMECTINA/i.test(text)) return 'SI';
  if (/ANTIPARASITARIO/i.test(text)) return 'SI';
  return 'NO';
}

export function extractProximoControl(text) {
  const patterns = [
    /PR[OÓ]XIMO\s+CONTROL\s+(?:DE\s+)?(?:PRIMERA\s+INFANCIA|INFANCIA|ADOLESCENCIA)\s+(?:A\s+LOS\s+)?(.+?)(?:\s+PLAN|\s*-|\s*$)/im,
    /SE\s+ESTIMA\s+UN\s+PR[OÓ]XIMO\s+CONTROL\s+A\s+LOS\s+(\d+\s+(?:A[ÑN]OS?|MESES?|DIAS?))\s+(?:POR|CON)\s+(\w+(?:\s+\w+)?)\s+(?:DE\s+)?PROGRAMA/i,
    /PR[OÓ]XIMO\s+CONTROL\s+(?:A\s+LOS\s+)?(\d+\s+(?:A[ÑN]OS?|MESES?|DIAS?))\s+(?:CON|POR)\s+(\w+)/i,
    /PR[OÓ]XIMO\s+CONTROL\s+CON\s+(\w+(?:\s+\w+)?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let result = match[2]
        ? `${match[1].trim()} CON ${match[2].trim()}`
        : match[1].trim();
      return result.replace(/\s+(?:DE|DEL|A|EN|POR|Y)\s*$/i, '').toUpperCase();
    }
  }
  return '';
}

export function detectTipoInscripcion(text) {
  const controlP = [
    /CONTROL\s+DE\s+(?:CRECIMIENTO|PRIMERA\s+INFANCIA|INFANCIA|ADOLESCENCIA)/i,
    /CONSULTA\s+DE\s+(?:CONTROL|SEGUIMIENTO)/i,
    /PARA\s+CONTROL/i, /CONTINUAR\s+CONTROL/i
  ];
  for (const p of controlP) { if (p.test(text)) return 'control'; }

  const primeraP = [
    /PRIMERA\s+VEZ/i, /1[°º]\s*VEZ/i,
    /PRIMER\s+(?:INGRESO|CONTROL)/i,
    /MEDICINA GENERAL-PRIMERA VEZ/i
  ];
  for (const p of primeraP) { if (p.test(text)) return '1aVez'; }
  return 'control';
}

export function calculateAge(fechaNacimiento, fechaAtencion) {
  if (!fechaNacimiento || !fechaAtencion) return '';
  const birth = new Date(fechaNacimiento + 'T00:00:00');
  const visit = new Date(fechaAtencion + 'T00:00:00');
  let years = visit.getFullYear() - birth.getFullYear();
  let months = visit.getMonth() - birth.getMonth();
  let days = visit.getDate() - birth.getDate();
  if (days < 0) {
    months--;
    days += new Date(visit.getFullYear(), visit.getMonth(), 0).getDate();
  }
  if (months < 0) { years--; months += 12; }
  const totalMonths = years * 12 + months;
  if (totalMonths < 1) return `${days} DIAS`;
  if (totalMonths < 24) return `${totalMonths} MESES`;
  return `${years} ANOS`;
}

export function matchNumber(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

function extractSiNo(text, pattern) {
  const match = text.match(pattern);
  if (!match) return '';
  return match[1].toUpperCase();
}

function convertVaccineDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  if (!year) return dateStr;
  const fullYear = year.length === 2
    ? (parseInt(year) < 50 ? `20${year}` : `19${year}`)
    : year;
  return `${fullYear}-${month}-${day}`;
}
