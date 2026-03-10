import { extractPlanificacionFamiliar } from './lifecycleExtractionHelpers.js';

const METHOD_MAP = {
  'LIGADURA': 'pomeroy',
  'POMEROY': 'pomeroy',
  'VASECTOMIA': 'vasectomia',
  'DIU': 'diu',
  'ACOS': 'anovulatoriosOrales',
  'INYECCION MENSUAL': 'inyectableMensual',
  'INYECCION TRIMESTRAL': 'inyectableTrimestral',
  'BARRERA': 'metodoBarrera',
  'IMPLANTE SUBDERMICO': 'implanteSubdermico'
};

export function extractMethodColumns(text) {
  const columns = {
    pomeroy: '', vasectomia: '', diu: '', anovulatoriosOrales: '',
    inyectableMensual: '', inyectableTrimestral: '',
    metodoBarrera: '', implanteSubdermico: ''
  };

  if (/PENDIENTE\s+(?:DE\s+)?IMPLANTE/i.test(text)
    || /SE\s+ORDENA\s+IMPLANTE/i.test(text)) {
    columns.implanteSubdermico = 'PENDIENTE';
    return columns;
  }

  const method = extractPlanificacionFamiliar(text);
  if (method === 'NINGUNO') return columns;

  const key = METHOD_MAP[method];
  if (key) columns[key] = 'X';

  return columns;
}

export function classifyVisitType(text) {
  if (/CONTROL\s+(?:DE\s+)?PLANIFICACI[OÓ]N/i.test(text)) return 'CONTROL';
  if (/CONTROL\s+(?:DE\s+)?(?:SEGUIMIENTO|M[EÉ]TODO)/i.test(text)) return 'CONTROL';
  const motivo = text.match(/MOTIVO DE LA CONSULTA[\s\n]+(.+?)(?:\n|$)/i);
  if (motivo && /CONTROL/i.test(motivo[1])) return 'CONTROL';
  if (/PRIMERA\s+VEZ\s+(?:DE\s+)?PLANIFICACI[OÓ]N/i.test(text)) return 'PRIMERA VEZ';
  if (/INGRESA\s+POR\s+PRIMERA\s+VEZ/i.test(text)) return 'PRIMERA VEZ';
  if (/ASESOR[IÍ]A\s+(?:EN\s+)?PLANIFICACI[OÓ]N/i.test(text)) return 'PRIMERA VEZ';
  if (motivo && /PRIMERA\s+VEZ/i.test(motivo[1])) return 'PRIMERA VEZ';
  return 'PRIMERA VEZ';
}

export function classifyProfessionalType(text) {
  if (/CONSULTA\s+(?:PRIMER[A]?\s+VEZ\s+)?POR\s+ENFERMER[IÍ]A/i.test(text)) return 'ENFERMERA';
  if (/CONTROL\s+(?:O\s+DE\s+)?SEGUIMIENTO\s+POR\s+ENFERMER[IÍ]A/i.test(text)) return 'ENFERMERA';
  if (/ENFERMER[AO]\s+JEFE/i.test(text)) return 'ENFERMERA';
  return 'MEDICO';
}

export function extractEfectoColateral(text) {
  if (/EFECTO(?:S)?\s+(?:COLATERAL|ADVERSO|SECUNDARIO)(?:ES|S)?[:\s]+SI/i.test(text)) return 'SI';
  if (/PRESENTA\s+EFECTO(?:S)?\s+(?:COLATERAL|ADVERSO|SECUNDARIO)/i.test(text)) return 'SI';
  if (/BUENA\s+TOLERANCIA/i.test(text)) return 'NO';
  if (/ADECUADA\s+TOLERANCIA/i.test(text)) return 'NO';
  if (/SIN\s+EFECTOS?\s+(?:COLATERAL|ADVERSO|SECUNDARIO)/i.test(text)) return 'NO';
  return 'NO';
}

export function extractUltimaCitologia(text) {
  if (/(?:ULTIMA\s+)?CITOLOG[IÍ]A[:\s]+NUNCA/i.test(text)) return 'NUNCA';

  const dateMatch = text.match(
    /(?:ULTIMA\s+)?CITOLOG[IÍ]A[:\s]+(\d{2})[\/.-](\d{2})[\/.-](\d{4})/i
  );
  if (dateMatch) return `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

  const yearMatch = text.match(/(?:ULTIMA\s+)?CITOLOG[IÍ]A[:\s]+(\d{4})/i);
  if (yearMatch) return yearMatch[1];

  if (/CITOLOG[IÍ]A[:\s]+NO\s+(?:APLICA|REFIERE|RECUERDA)/i.test(text)) return '-';
  return '-';
}

export function extractProximoControl(text, fechaAtencion) {
  const monthsMatch = text.match(
    /PR[OÓ]XIMO\s+CONTROL\s+EN\s+(\d+)\s+MES(?:ES)?/i
  );
  if (monthsMatch && fechaAtencion) {
    const months = parseInt(monthsMatch[1]);
    const date = new Date(fechaAtencion);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  const MONTHS = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
  ];
  const monthMatch = text.match(/PR[OÓ]XIMO\s+CONTROL[:\s]+(?:EN\s+)?(\w+)/i);
  if (monthMatch && MONTHS.includes(monthMatch[1].toUpperCase())) {
    return monthMatch[1].toUpperCase();
  }

  return '';
}

export function extractAnalisisAddress(text) {
  const match = text.match(
    /DIRECCI[OÓ]N\s+DE\s+RESIDENCIA[:\s]+(.+?)(?:\s*TEL[ÉE]FONO|\n|$)/i
  );
  if (match) return match[1].trim().toUpperCase();
  return null;
}

export function extractAnalisisPhone(text) {
  const match = text.match(/TEL[ÉE]FONOS?[:\s]+(\d{7,})/i);
  return match ? match[1] : null;
}
