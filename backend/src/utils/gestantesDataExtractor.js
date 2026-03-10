import { PDFProcessor } from './pdfProcessor.js';
import { parseColombianName } from './rcvDataExtractor.js';
import { matchNumber } from './pediatricExtractionHelpers.js';
import { extractEdadNumeric } from './lifecycleExtractionHelpers.js';
import {
  extractDocumentType, extractCPNNumber, extractObstetricFormula,
  extractFUM, extractFPP, extractRiesgoObstetrico, extractAlturaUterina,
  extractEdadGestacionalActual, extractEcografias, extractValoraciones,
  extractCursoMaternidad, extractIVEAsesoria, extractMicronutrientes,
  extractLabResults, extractHemoclasificacionFromAnalisis,
  classifyIMCGestacional, normalizeDateToISO
} from './gestantesExtractionHelpers.js';

export class GestantesDataExtractor {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.processor = new PDFProcessor(pdfPath);
  }

  async extract(fechaAtencion, nombremedico) {
    this.text = await this.processor.extractText();
    const demographics = this.extractDemographics();
    const vitals = this.extractVitalSigns();
    const pregnancy = this.extractPregnancyData();
    const labs = extractLabResults(this.text);
    const hemoclasificacion = extractHemoclasificacionFromAnalisis(this.text);

    return {
      ...demographics,
      ...vitals,
      ...pregnancy,
      ...labs,
      ...hemoclasificacion,
      fechaAtencion,
      nombremedico: nombremedico || '',
      diagnostico: this.extractDiagnostico(),
      movimientosFetales: this.extractMovimientosFetales(),
      fcFetal: '',
      signosAlarma: '',
      observaciones: ''
    };
  }

  extractDemographics() {
    const t = this.text;
    const nameData = this.extractNameAndId();
    const contactData = this.extractContactAndDisability();

    const fechaNacMatch = t.match(/Fecha nacimiento:\s*(\d{4}-\d{2}-\d{2})/i);

    return {
      ...nameData,
      fechaNacimiento: fechaNacMatch ? fechaNacMatch[1] : '',
      edad: extractEdadNumeric(t) || '',
      ...contactData
    };
  }

  extractNameAndId() {
    const t = this.text;
    const data = { primerApellido: '', segundoApellido: '', primerNombre: '', segundoNombre: '' };

    const nameMatch = t.match(/Nombre del paciente:\s*(.+?)\s*-\s*(\d+)/i);
    if (nameMatch) {
      const parsed = parseColombianName(nameMatch[1].trim());
      data.primerApellido = parsed.apellido1;
      data.segundoApellido = parsed.apellido2;
      data.primerNombre = parsed.nombre1;
      data.segundoNombre = parsed.nombre2;
    }

    const idMatch = t.match(/identificaci[oó]n:\s*(CC|TI|CE|PA|RC|PT)\s*(\d+)/i);
    data.tipoId = extractDocumentType(t);
    data.identificacion = idMatch ? idMatch[2] : '';

    return data;
  }

  extractContactAndDisability() {
    const t = this.text;
    const addrAnalisis = t.match(/DIRECCI[OÓ]N(?:\s+DE\s+RESIDENCIA)?[;:\s]+(.+?)(?:\s+TEL[EÉ]FONO|\s+BARRIO|\n|$)/i);
    const addrDemo = t.match(/Direcci[oó]n:\s*(.+?)(?:\s+Tel|\s+Fecha|$)/i);
    const phoneAnalisis = t.match(/TEL[EÉ]FONO(?:S)?[;:\s]+(\d+)/i);
    const phoneDemo = t.match(/Tel[eé]fono:\s*(\d+)/i);

    const discMatch = t.match(/Tipo de discapacidad:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s+Identidad/i);
    const rawDisc = discMatch ? discMatch[1].trim() : 'NO APLICA';

    return {
      direccion: (addrAnalisis?.[1] || addrDemo?.[1] || '').trim(),
      telefono: phoneAnalisis?.[1] || phoneDemo?.[1] || '',
      discapacidad: /NO APLICA/i.test(rawDisc) ? 'NO' : 'SI',
      tipoDiscapacidad: rawDisc
    };
  }

  extractVitalSigns() {
    const t = this.text;
    const { peso, talla, imc } = this.extractBodyMeasures();
    const { paSistolica, paDiastolica, tensionArterial } = this.extractBloodPressure();

    const fc = matchNumber(t, /FRECUENCIA CARDIACA\s*\(PPM\)\s*(\d+)/i)
      ?? matchNumber(t, /FC[:\s]+(\d+)/i);

    return {
      peso, talla, imc,
      clasificacionIMC: classifyIMCGestacional(imc || null),
      paSistolica, paDiastolica, tensionArterial,
      fcGestante: fc ?? '',
      alturaUterina: extractAlturaUterina(t)
    };
  }

  extractBodyMeasures() {
    const t = this.text;
    const peso = matchNumber(t, /PESO\s*\(KG\)\s*(\d+(?:\.\d+)?)/i) ?? '';
    const talla = matchNumber(t, /TALLA\s*\(CM\)(?:\s*EJM:\s*\d+\.\d+)?\s*(\d+(?:\.\d+)?)/i) ?? '';
    let imc = matchNumber(t, /IMC\s*(\d+(?:\.\d+)?)/i);
    if (imc === null && peso && talla) {
      const h = talla / 100;
      imc = parseFloat((peso / (h * h)).toFixed(2));
    }
    return { peso, talla, imc: imc ?? '' };
  }

  extractBloodPressure() {
    const t = this.text;
    const pa = t.match(/PRESION ARTERIAL\s*\(MM\s*HG\)\s*(\d+\/\d+)/i)
      || t.match(/PRESION ARTERIAL[:\s]+(\d+\/\d+)/i)
      || t.match(/(\d{2,3}\/\d{2,3})\s*MMHG/i);
    const paStr = pa ? pa[1] : '';
    const [paSistolica, paDiastolica] = paStr ? paStr.split('/') : ['', ''];
    return { paSistolica, paDiastolica, tensionArterial: paStr };
  }

  extractPregnancyData() {
    const t = this.text;
    const formula = extractObstetricFormula(t);
    const riesgo = extractRiesgoObstetrico(t);
    const edadGestacional = extractEdadGestacionalActual(t);

    return {
      cpnNumber: extractCPNNumber(t),
      g: formula.g, p: formula.p, c: formula.c,
      a: formula.a, v: formula.v, m: formula.m,
      fum: extractFUM(t),
      fpp: extractFPP(t),
      edadGestacionalIngreso: edadGestacional,
      edadGestacional,
      trimestreInicioCPN: calculateTrimestre(edadGestacional),
      clasificacionRiesgo: riesgo.clasificacion,
      causaAltoRiesgo: riesgo.causa,
      iveAsesoria: extractIVEAsesoria(t),
      cursoMaternidad: extractCursoMaternidad(t),
      ...this.extractSupplementaryData()
    };
  }

  extractSupplementaryData() {
    const t = this.text;
    const ecografias = extractEcografias(t);
    const valoraciones = extractValoraciones(t);
    const micronutrientes = extractMicronutrientes(t);

    return {
      tamizajeGenetico: ecografias.tamizajeFecha,
      detalleAnatomico: ecografias.detalleAnatomicoFecha,
      consultaOdontologia: valoraciones.odontologia,
      consultaPsicologia: valoraciones.psicologia,
      consultaNutricion: valoraciones.nutricion,
      consultaGinecologia: valoraciones.ginecologia,
      acidoFolico: micronutrientes.acidoFolico,
      sulfatoFerroso: micronutrientes.sulfatoFerroso,
      calcio: micronutrientes.calcio,
      fechaInicioAsa: '',
      vacInfluenza: '', vacTetano: '', vacTdap: '', vacCovid: ''
    };
  }

  extractDiagnostico() {
    const match = this.text.match(/DIAGNOSTICO PRINCIPAL[:\s]+(.+?)(?:\n|DIAGNOSTICO|$)/i)
      || this.text.match(/IMPRESION DIAGNOSTICA[:\s]+(.+?)(?:\n|$)/i);
    return match ? match[1].trim() : '';
  }

  extractMovimientosFetales() {
    if (/NO PERCEPCI[OÓ]N DE MOVIMIENTOS FETALES/i.test(this.text)) return 'NO';
    if (/MOVIMIENTOS FETALES/i.test(this.text)) return 'SI';
    return '';
  }
}

function calculateTrimestre(edadGestacional) {
  if (!edadGestacional) return '';
  const weeks = parseFloat(edadGestacional);
  if (isNaN(weeks)) return '';
  if (weeks <= 13) return '1';
  if (weeks <= 27) return '2';
  return '3';
}

export async function extractGestantesDataFromPDF(pdfPath, fechaAtencion, nombremedico) {
  const extractor = new GestantesDataExtractor(pdfPath);
  return extractor.extract(fechaAtencion, nombremedico);
}
