export function classifyIMC(imc) {
  if (!imc) return '';
  if (imc < 18.5) return 'BAJO PESO';
  if (imc < 25) return 'ADECUADO';
  if (imc < 30) return 'SOBREPESO';
  return 'OBESIDAD';
}

export function extractOrientacionSexual(text) {
  const match = text.match(/ORIENTACI[OÓ]N\s+SEXUAL[:\s]+(HETEROSEXUAL|HOMOSEXUAL|BISEXUAL)/i);
  return match ? match[1].toUpperCase() : '';
}

export function extractIdentidadGenero(text) {
  const match = text.match(/Identidad\s+de\s+gen[eé]ro[:\s]+(MASCULINO|FEMENINO)/i)
    || text.match(/SE\s+IDENTIFICA\s+CON\s+EL\s+G[EÉ]NERO[:\s]+(MASCULINO|FEMENINO)/i);
  return match ? match[1].toUpperCase() : '';
}

export function extractAntecedentesFamiliares(text) {
  const match = text.match(/FAMILIARES?[:\s]+(.+?)(?:\n|QUIR[UÚ]RGICOS|TRAUM[AÁ]TICOS|FARMACOL[OÓ]GICOS)/i);
  if (!match) return 'NIEGA';
  const val = match[1].trim().replace(/\s+/g, ' ');
  if (/^NIEGA$/i.test(val)) return 'NIEGA';
  return val.toUpperCase();
}

export function extractAntecedentesPersonales(text) {
  const structured = text.match(/(?:^|\n)\s*PATOL[OÓ]GICOS[:\s]+(.+?)(?:\n|$)/im);
  if (structured) {
    const val = structured[1].trim().replace(/\s+/g, ' ');
    if (/^NIEGA$/i.test(val) || val.length < 3) return 'NIEGA';
    if (val.length > 150) return 'NIEGA';
    return val.toUpperCase();
  }
  if (/SIN\s+ANTECEDENTES\s+PATOL[OÓ]GICOS/i.test(text)) return 'NIEGA';
  return 'NIEGA';
}

export function extractDiscapacidad(text) {
  const demo = text.match(/Tipo de discapacidad[:\s]+([^\n]+)/i);
  if (demo && /NO APLICA/i.test(demo[1])) return 'NINGUNA';
  const match = text.match(/DISCAPACIDADES?[:\s]+(NIEGA|NINGUNA|[^\n.]+)/i);
  if (match) {
    const val = match[1].trim().toUpperCase();
    return val === 'NIEGA' ? 'NINGUNA' : val;
  }
  return 'NINGUNA';
}

export function extractConsumoSustancias(text) {
  if (/CONSUMO\s+DE\s+SUSTANCIAS\s+PSICOACTIVAS[:\s]+SI/i.test(text)) return 'SI';
  if (/CONSUMO\s+DE\s+(?:MARIHUANA|COCAINA|BAZUCO|HEROINA|SUSTANCIAS)/i.test(text)
    && !/NIEGA\s+CONSUMO/i.test(text)) return 'SI';
  if (/SPA[:\s]+SI/i.test(text)) return 'SI';
  return 'NO';
}

export function extractConsumoTabaco(text) {
  if (/FUMADOR\s+ACTIVO/i.test(text)) return 'SI';
  if (/TABAQUISMO\s+ACTIVO/i.test(text)) return 'SI';
  if (/CIGARRILLO[:\s]+SI/i.test(text)) return 'SI';
  if (/\d+\s+(?:PQTS?|PAQUETES?|CIGARRILLOS?)\s+(?:AL\s+)?DIA/i.test(text)) return 'SI';
  if (/EXTABAQUISMO/i.test(text)) return 'SI';
  return 'NO';
}

export function extractConsumoAlcohol(text) {
  if (/ALCOHOL[:\s]+SI/i.test(text)) return 'SI';
  if (/CONSUMO\s+DE\s+ALCOHOL\s+(?:SOCIAL|OCASIONAL|FRECUENTE|DIARIO)/i.test(text)) return 'SI';
  if (/NIEGA\s+CONSUMO\s+DE\s+ALCOHOL/i.test(text)) return 'NO';
  return 'NO';
}

export function extractPlanificacionFamiliar(text) {
  const methods = [
    [/INYECCI[OÓ]N\s+MENSUAL/i, 'INYECCION MENSUAL'],
    [/INYECCI[OÓ]N\s+TRIMESTRAL/i, 'INYECCION TRIMESTRAL'],
    [/IMPLANTE\s+SUBD[EÉ]RMICO/i, 'IMPLANTE SUBDERMICO'],
    [/IMPLANTE/i, 'IMPLANTE SUBDERMICO'],
    [/\bACOS?\b/i, 'ACOS'],
    [/ANTICONCEPTIVOS?\s+ORALES/i, 'ACOS'],
    [/\bDIU\b/i, 'DIU'],
    [/LIGADURA/i, 'LIGADURA'],
    [/VASECTOM[IÍ]A/i, 'VASECTOMIA'],
    [/MENOPAUSIA/i, 'NINGUNO'],
  ];
  for (const [pattern, method] of methods) {
    if (pattern.test(text)) return method;
  }
  if (/SE\s+REMITE\s+AL?\s+PROGRAMA\s+DE\s+PLANIFICACI[OÓ]N/i.test(text)) return 'NINGUNO';
  return 'NINGUNO';
}

export function extractCitologiaFecha(text) {
  const full = text.match(/CITOLOG[IÍ]A\s+DEL?\s+(\d{2})[\/.-](\d{2})[\/.-](\d{4})/i);
  if (full) return `${full[3]}-${full[2]}-${full[1]}`;
  const year = text.match(/CITOLOG[IÍ]A[:\s]+(\d{4})/i)
    || text.match(/FECHA\s+ULTIMA\s+CITOLOG[IÍ]A[:\s]+(\d{4})/i);
  if (year) return year[1];
  if (/CITOLOG[IÍ]A[:\s]+NO\s+(?:APLICA|REFIERE|TIENE)/i.test(text)) return 'NA';
  return 'NA';
}

export function extractMamografiaFecha(text) {
  const full = text.match(/MAMOGRAF[IÍ]A[:\s]+(\d{2})[\/.-](\d{2})[\/.-](\d{4})/i);
  if (full) return `${full[3]}-${full[2]}-${full[1]}`;
  if (/(?:FU\s+)?MAMOGRAF[IÍ]A[:\s]+NO\s+APLICA/i.test(text)) return 'NA';
  return 'NA';
}

export function extractTactoRectal(text, sexo, edad) {
  const match = text.match(/TACTO\s+RECTAL[:\s]+(SI|NO)/i);
  if (match) return match[1].toUpperCase();
  if (sexo === 'F') return 'NO APLICA';
  if (edad && edad < 50) return 'NO APLICA';
  return 'NO';
}

export function extractSifilis(text) {
  const match = text.match(/(?:VDRL|S[IÍ]FILIS|SEROL[OÓ]G[IÍ]A)[:\s]+(REACTIVO|NO\s+REACTIVO)/i);
  if (match) return match[1].replace(/\s+/g, ' ').toUpperCase();
  return '-';
}

export function extractVIH(text) {
  const match = text.match(/VIH[:\s]+(REACTIVO|NO\s+REACTIVO|NEGATIVO|POSITIVO)/i);
  if (match) return match[1].toUpperCase();
  return '-';
}

export function extractLifecycleLabDate(text) {
  const match = text.match(/PARACL[IÍ]NICOS\s+DEL[:\s]+(\d{2})[\/.-](\d{2})[\/.-](\d{4})/i);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const short = text.match(/--(\d{2})\/(\d{2})\/(\d{2})\s/);
  if (short) {
    const yr = parseInt(short[3]) < 50 ? `20${short[3]}` : `19${short[3]}`;
    return `${yr}-${short[2]}-${short[1]}`;
  }
  return '';
}

export function extractEdadNumeric(text) {
  const match = text.match(/Edad[:\s]+(\d+)/i);
  return match ? parseInt(match[1]) : null;
}
