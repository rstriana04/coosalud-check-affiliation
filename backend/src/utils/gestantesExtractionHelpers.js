import { extractDocumentType } from './citologiasExtractionHelpers.js';

export { extractDocumentType };

export function normalizeDateToISO(dateStr) {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return '';
  const [, day, month, yearRaw] = match;
  const year = yearRaw.length === 2
    ? (parseInt(yearRaw) <= 50 ? `20${yearRaw}` : `19${yearRaw}`)
    : yearRaw;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function extractCPNNumber(text) {
  const match = text.match(/(?:CONTROL\s+PRENATAL|CPN)\s*#?\s*(\d+)/i);
  return match ? match[1] : null;
}

export function extractObstetricFormula(text) {
  const result = { g: '', p: '', c: '', a: '', v: '', m: '' };
  const compact = text.match(/G(\d+)\s*P(\d+)\s*(?:A(\d+)\s*)?C(\d+)\s*(?:E(\d+)\s*)?M(\d+)\s*V(\d+)/i);
  if (compact) {
    result.g = compact[1]; result.p = compact[2]; result.a = compact[3] || '0';
    result.c = compact[4]; result.v = compact[7]; result.m = compact[6];
    return result;
  }
  const spaced = text.match(/G\s*(\d+)\s+P\s*(\d+)\s+C\s*(\d+)\s+A\s*(\d+)\s+(?:E\s*\d+\s+)?M\s*(\d+)\s+V\s*(\d+)/i);
  if (spaced) {
    result.g = spaced[1]; result.p = spaced[2]; result.c = spaced[3];
    result.a = spaced[4]; result.m = spaced[5]; result.v = spaced[6];
    return result;
  }
  const fields = { g: /G\s*(\d+)/i, p: /P\s*(\d+)/i, c: /C\s*(\d+)/i, a: /A\s*(\d+)/i, v: /V\s*(\d+)/i, m: /M\s*(\d+)/i };
  const section = text.match(/(?:FORMULA\s+OBST[EÉ]TRICA|FO)[;:\s]+([^\n]{5,40})/i);
  if (section) {
    const s = section[1];
    for (const [key, rx] of Object.entries(fields)) {
      const m = s.match(rx);
      if (m) result[key] = m[1];
    }
  }
  return result;
}

export function extractFUM(text) {
  const match = text.match(/FUM[;:\s]+(.+?)(?:\s+FPP|\s+FORMULA|\s+RIESGO|\s+EDAD\s+GESTACIONAL|\n)/i);
  return match ? match[1].trim() : '';
}

export function extractFPP(text) {
  const match = text.match(/FPP[;:\s]+(.+?)(?:\s+FUM|\s+RIESGO|\s+ECOGRAF|\s+FORMULA|\n)/i);
  return match ? match[1].trim() : '';
}

export function extractRiesgoObstetrico(text) {
  const result = { clasificacion: '', causa: '' };
  const match = text.match(/RIESGO\s+OBST[EÉ]TRIC[OA][;:\s]+(\w+)\s*(.*?)(?:\s+FUM|\s+FPP|\s+FORMULA|\s+ECOGRAF|\n)/i);
  if (!match) return result;
  const clasif = match[1].toUpperCase();
  if (['ALTO', 'BAJO', 'MARO'].includes(clasif)) result.clasificacion = clasif;
  else result.clasificacion = clasif;
  result.causa = match[2] ? match[2].trim() : '';
  return result;
}

export function extractAlturaUterina(text) {
  const match = text.match(/AU[;:\s]+(\d+(?:\.\d+)?)\s*CM/i);
  return match ? match[1] : '';
}

export function extractEdadGestacionalActual(text) {
  const extrapoladas = text.match(/EXTRAPOLADAS?\s+A\s+HOY\s+(\d+[.,]\d+)\s*SS/i);
  if (extrapoladas) return extrapoladas[1].replace(',', '.');
  const semanas = text.match(/(\d+[.,]\d+)\s*SEMANAS/i);
  if (semanas) return semanas[1].replace(',', '.');
  const semDias = text.match(/EMBARAZO\s+DE\s+(\d+)\s*SEMANAS?,?\s*(\d+)\s*D[IÍ]AS?/i);
  if (semDias) {
    const weeks = parseInt(semDias[1]);
    const days = parseInt(semDias[2]);
    return (weeks + days / 7).toFixed(1);
  }
  const semSimple = text.match(/(\d+)\s*SEMANAS?\s+DE\s+(?:GESTACI[OÓ]N|EMBARAZO)/i);
  if (semSimple) return semSimple[1];
  return '';
}

export function extractEcografias(text) {
  const result = { tamizajeFecha: '', detalleAnatomicoFecha: '' };
  const ecoSection = text.match(/ECOGRAF[IÍ]AS?[;:\s]+([\s\S]{10,500})(?:VALORACIONES|CURSO|MICRONUTRIENTES|$)/i);
  const section = ecoSection ? ecoSection[1] : text;
  const ecoEntries = [...section.matchAll(/#\s*(\d+)\s+DEL\s+(\d{2}\/\d{2}\/\d{2,4})/gi)];
  if (ecoEntries.length > 0) result.tamizajeFecha = normalizeDateToISO(ecoEntries[0][2]);
  const detalle = section.match(/DETALLE\s+ANAT[OÓ]MIC[OA][;:\s]*(\d{2}\/\d{2}\/\d{2,4})/i);
  if (detalle) {
    result.detalleAnatomicoFecha = normalizeDateToISO(detalle[1]);
  } else {
    for (const entry of ecoEntries) {
      const nearby = section.substring(section.indexOf(entry[0]), section.indexOf(entry[0]) + 100);
      if (/DETALLE\s+ANAT[OÓ]MIC/i.test(nearby)) {
        result.detalleAnatomicoFecha = normalizeDateToISO(entry[2]);
        break;
      }
    }
  }
  if (!result.tamizajeFecha) {
    const tn = section.match(/(?:TN|TAMIZAJE)[;:\s]*(\d{2}\/\d{2}\/\d{2,4})/i);
    if (tn) result.tamizajeFecha = normalizeDateToISO(tn[1]);
  }
  return result;
}

export function extractValoraciones(text) {
  const result = { odontologia: '', psicologia: '', nutricion: '', ginecologia: '' };
  const mapping = [
    ['odontologia', /ODONTOLOG[IÍ]A[;:\s]*(\d{2}\/\d{2}\/\d{2,4})/i],
    ['psicologia', /PSICOLOG[IÍ]A[;:\s]*(\d{2}\/\d{2}\/\d{2,4})/i],
    ['nutricion', /NUTRICI[OÓ]N(?:ISTA)?[;:\s]*(\d{2}\/\d{2}\/\d{2,4})/i],
    ['ginecologia', /GINECOLOG[IÍ]A[;:\s]*(\d{2}\/\d{2}\/\d{2,4})/i],
  ];
  for (const [key, pattern] of mapping) {
    const match = text.match(pattern);
    if (match) result[key] = normalizeDateToISO(match[1]);
  }
  return result;
}

export function extractCursoMaternidad(text) {
  const match = text.match(/CURSO\s+DE\s+PREPARACI[OÓ]N\s+PARA\s+LA\s+MATERNIDAD[^;:\n]*[;:\s]+(SI|NO)/i);
  return match ? match[1].toUpperCase() : '';
}

export function extractIVEAsesoria(text) {
  if (/SE\s+BRINDA\s+ASESOR[IÍ]A\s+EN\s+IVE/i.test(text)) return 'SI';
  if (/ASESOR[IÍ]A\s+(?:EN\s+)?IVE[;:\s]+(SI|NO)/i.test(text)) {
    return text.match(/ASESOR[IÍ]A\s+(?:EN\s+)?IVE[;:\s]+(SI|NO)/i)[1].toUpperCase();
  }
  return '';
}

export function extractMicronutrientes(text) {
  const result = { acidoFolico: 'NO', sulfatoFerroso: 'NO', calcio: 'NO' };
  if (/[AÁ]CIDO\s+F[OÓ]LICO/i.test(text)) result.acidoFolico = 'SI';
  if (/SULFATO\s+FERROSO/i.test(text)) result.sulfatoFerroso = 'SI';
  if (/CARBONATO\s+DE\s+CALCIO|CALCIO\s+(?:600|MG)/i.test(text)) result.calcio = 'SI';
  return result;
}

export function classifyIMCGestacional(imc) {
  if (imc == null || isNaN(imc)) return '';
  if (imc < 18.5) return 'BAJO PESO';
  if (imc <= 24.9) return 'NORMAL';
  if (imc <= 29.9) return 'SOBREPESO';
  return 'OBESIDAD';
}

function parseLabSections(text) {
  const paraSection = text.match(/PARACL[IÍ]NICOS[;:\s]*([\s\S]+?)(?:VALORACIONES|ECOGRAF[IÍ]AS|PLAN\s+DE\s+MANEJO|AN[AÁ]LISIS|$)/i);
  const labText = paraSection ? paraSection[1] : text;
  const sections = [];
  const parts = labText.split(/--\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  for (let i = 1; i < parts.length; i += 2) {
    const date = normalizeDateToISO(parts[i]);
    const content = parts[i + 1] || '';
    if (date) sections.push({ date, text: content });
  }
  return sections;
}

const torchPatterns = [
  ['toxoIgG', /IGG\s+TOXOPLASM\w*/i],
  ['toxoIgM', /IGM\s+TOXOPLASM\w*/i],
  ['cmvIgG', /IGG\s+CITOMEGALOVIRUS/i],
  ['cmvIgM', /IGM\s+CITOMEGALOVIRUS/i],
  ['rubeolaIgG', /IGG\s+RUBEOLA/i],
  ['rubeolaIgM', /IGM\s+RUBEOLA/i],
];

function extractTorchValue(text) {
  const match = text.match(/[;:\s]*([<>]?\s*\d+(?:\.\d+)?)\s*(NEGATIVO|POSITIVO)?/i);
  if (!match) return '';
  return match[2] ? `${match[1].trim()} ${match[2].toUpperCase()}` : match[1].trim();
}

export function extractLabResults(text) {
  const result = {
    hemogramaInicialFecha: '', hemogramaInicialHB: '',
    hemogramaControlFecha: '', hemogramaControlHB: '',
    glicemiaFecha: '', glicemiaResultado: '',
    toxoIgGFecha: '', toxoIgGResultado: '', toxoIgMFecha: '', toxoIgMResultado: '',
    cmvIgGFecha: '', cmvIgGResultado: '', cmvIgMFecha: '', cmvIgMResultado: '',
    rubeolaIgGFecha: '', rubeolaIgGResultado: '', rubeolaIgMFecha: '', rubeolaIgMResultado: '',
    urocultivoFecha: '', urocultivoResultado: '',
    hepatitisBFecha: '', hepatitisBResultado: '',
    vihTrim1Fecha: '', vihTrim1Resultado: '',
    vihTrim2Fecha: '', vihTrim2Resultado: '',
    vihTrim3Fecha: '', vihTrim3Resultado: '',
    serologiaTrim1Fecha: '', serologiaTrim1Resultado: '',
    serologiaTrim2Fecha: '', serologiaTrim2Resultado: '',
    serologiaTrim3Fecha: '', serologiaTrim3Resultado: '',
  };
  const sections = parseLabSections(text);
  let hemogramaCount = 0;
  let vihCount = 0;
  let serologiaCount = 0;

  for (const { date, text: sectionText } of sections) {
    const hb = sectionText.match(/(?:HEMOGRAMA|HB)[;:\s]*(?:HB[;:\s]*)?(\d+(?:\.\d+)?)/i);
    if (hb) {
      if (hemogramaCount === 0) {
        result.hemogramaInicialFecha = date;
        result.hemogramaInicialHB = hb[1];
      } else {
        result.hemogramaControlFecha = date;
        result.hemogramaControlHB = hb[1];
      }
      hemogramaCount++;
    }

    const glucosa = sectionText.match(/GLUCOSA[;:\s]*(\d+(?:\.\d+)?)\s*MG/i);
    if (glucosa && !result.glicemiaFecha) {
      result.glicemiaFecha = date;
      result.glicemiaResultado = glucosa[1];
    }

    for (const [key, pattern] of torchPatterns) {
      const torchMatch = sectionText.match(pattern);
      if (torchMatch && !result[`${key}Fecha`]) {
        result[`${key}Fecha`] = date;
        const afterLabel = sectionText.substring(torchMatch.index + torchMatch[0].length);
        result[`${key}Resultado`] = extractTorchValue(afterLabel);
      }
    }

    const urocultivo = sectionText.match(/UROCULTIVO[;:\s]*(.+?)(?:\s+--|\s+HEMOCLASIFICACI|\s+PRUEBA|\n|$)/i);
    if (urocultivo && !result.urocultivoFecha) {
      result.urocultivoFecha = date;
      result.urocultivoResultado = urocultivo[1].trim();
    }

    const hepB = sectionText.match(/AG\s+HBS[;:\s]*(NO\s+REACTIVO|REACTIVO|NEGATIVO|POSITIVO)/i);
    if (hepB && !result.hepatitisBFecha) {
      result.hepatitisBFecha = date;
      result.hepatitisBResultado = hepB[1].toUpperCase();
    }

    const vih = sectionText.match(/(?:PRUEBA\s+R[AÁ]PIDA\s+)?VIH[;:\s]*(NEGATIVO|POSITIVO|NO\s+REACTIVO|REACTIVO)/i);
    if (vih && vihCount < 3) {
      const trimKey = `vihTrim${vihCount + 1}`;
      result[`${trimKey}Fecha`] = date;
      result[`${trimKey}Resultado`] = vih[1].toUpperCase();
      vihCount++;
    }

    const sifilis = sectionText.match(/(?:PRUEBA\s+R[AÁ]PIDA\s+)?S[IÍ]FILIS[;:\s]*(NO\s+REACTIVO|REACTIVO|NEGATIVO|POSITIVO)/i);
    if (sifilis && serologiaCount < 3) {
      const trimKey = `serologiaTrim${serologiaCount + 1}`;
      result[`${trimKey}Fecha`] = date;
      result[`${trimKey}Resultado`] = sifilis[1].toUpperCase();
      serologiaCount++;
    }
  }

  return result;
}

export function extractHemoclasificacionFromAnalisis(text) {
  const result = { tipo: '', fecha: '' };
  const match = text.match(/HEMOCLASIFICACI[OÓ]N(?:\s+MATERNA)?[;:\s]+([ABO]+\s+(?:POSITIVO|NEGATIVO))/i);
  if (match) {
    result.tipo = match[1].toUpperCase();
    const beforeMatch = text.substring(0, match.index);
    const dateMatches = [...beforeMatch.matchAll(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g)];
    if (dateMatches.length > 0) {
      result.fecha = normalizeDateToISO(dateMatches[dateMatches.length - 1][1]);
    }
  }
  return result;
}
