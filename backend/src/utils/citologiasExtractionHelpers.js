import { extractPlanificacionFamiliar } from './lifecycleExtractionHelpers.js';

export function extractFechaUltimaMenstruacion(text) {
  const match = text.match(/FECHA\s+DE\s+LA\s+[UÚ]LTIMA\s+MENSTRUACI[OÓ]N\s+([A-ZÁÉÍÓÚÑ]+(?:\s+\d{4})?)/i);
  if (match) return match[1].trim();
  const fum = text.match(/FUM[;:\s]+([A-ZÁÉÍÓÚÑ]+(?:\s+\d{4})?)/i);
  if (fum) return fum[1].trim();
  return '';
}

export function extractFechaUltimaCitologia(text) {
  const match = text.match(/FECHA\s+DE\s+LA\s+[UÚ]LTIMA\s+CITOLOG[IÍ]A\s+([A-ZÁÉÍÓÚÑ\d/]+(?:\s+\d{4})?)/i);
  if (match) return match[1].trim();
  const uc = text.match(/[UÚ]LTIMA\s+CITOLOG[IÍ]A[;:\s]+([A-ZÁÉÍÓÚÑ\d/]+(?:\s+\d{4})?)/i);
  if (uc) return uc[1].trim();
  return '';
}

export function classifyCitologiaVisitType(text, fechaUltimaCitologia) {
  const result = { primeraVez: '', control: '', repetida: '', gestante: '' };

  if (/GESTANTE|EMBARAZ|EDAD\s+GESTACIONAL/i.test(text)) {
    const eg = text.match(/EDAD\s+GESTACIONAL[;:\s]*(\d+(?:\.\d+)?)\s*SEMANAS/i);
    result.gestante = eg ? `${eg[1]} SEM` : 'X';
    return result;
  }

  if (/INADECUAD[OA]|REPETIR\s+CITOLOG/i.test(text)) {
    result.repetida = 'X';
    return result;
  }

  if (fechaUltimaCitologia && fechaUltimaCitologia !== '' && !/NUNCA|PRIMERA|JAMAS/i.test(fechaUltimaCitologia)) {
    result.control = 'X';
  } else {
    result.primeraVez = 'X';
  }

  return result;
}

export function extractResultadoAnterior(text) {
  const result = { negativa: '', positiva: '', ascus: '', inadecuada: '' };

  const section = text.match(/(?:CON\s+)?RESULTADO\s+(.{5,80})(?:PARA\s+MALIGNIDAD)?/i);
  if (!section) return result;

  const val = section[1].toUpperCase();
  if (/NEGATIV/.test(val)) {
    result.negativa = 'X';
  } else if (/NIC/.test(val)) {
    const nic = val.match(/(NIC\s*\w+)/i);
    result.positiva = nic ? nic[1] : 'X';
  } else if (/POSITIV/.test(val)) {
    result.positiva = 'X';
  } else if (/ASCUS/.test(val)) {
    result.ascus = 'X';
  } else if (/INADECUAD/.test(val)) {
    result.inadecuada = 'X';
  }

  return result;
}

export function extractProcedimientosCuello(text) {
  const result = { no: '', si: '', cual: '' };

  const match = text.match(/PROCEDIMIENTOS\s+EN\s+EL\s+CUELLO\s+(?:DEL\s+)?[UÚ]TERO[;:\s]+(.+?)(?:\s+PAREJAS|\s+PLANIFICACION|\s+MENARCA|\s+CICLOS|$)/i);

  if (match) {
    const val = match[1].trim();
    if (/^(NINGUNO|NO\b|NIEGA)/i.test(val)) {
      result.no = 'X';
    } else {
      result.si = 'X';
      result.cual = val;
    }
  } else {
    result.no = 'X';
  }

  return result;
}

export function extractMetodoPlanificacion(text) {
  const match = text.match(/PLANIFICACION[;:\s]+(.+?)(?:\s+CICLOS|\s+MENARCA|\s+PROCEDIMIENTOS|\s+FECHA|\s+PAREJAS|$)/i);
  if (match) {
    const val = match[1].trim();
    if (val.length > 0 && val.length < 80) return val;
  }

  const method = extractPlanificacionFamiliar(text);
  if (method && method !== '-') return method;

  return '';
}

export function extractOcupacion(text) {
  const analisis = text.match(/OCUPACION[;:\s]+(.+?)(?:\s+ESCOLARIDAD|\s+HOSPITALIZACIONES|\s+ANTECEDENTES|\s+HEMOCLASIFICACION|$)/i);
  if (analisis) return analisis[1].trim();
  return '';
}

export function extractEscolaridad(text) {
  const match = text.match(/ESCOLARIDAD[;:\s]+(.+?)(?:\s+OCUPACION|\s+HOSPITALIZACIONES|\s+ANTECEDENTES|\s+HEMOCLASIFICACION|\s+DIRECCION|$)/i);
  if (match) return match[1].trim();
  return '';
}

export function extractDocumentType(text) {
  const match = text.match(/(?:tipo\s+de\s+)?identificaci[oó]n[;:\s]*(\w+)/i);
  if (match) {
    const tipo = match[1].toUpperCase();
    if (['CC', 'TI', 'CE', 'PT', 'RC', 'PA'].includes(tipo)) return tipo;
  }
  return 'CC';
}
