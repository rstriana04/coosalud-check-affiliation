import { PDFProcessor } from './pdfProcessor.js';
import { parseColombianName } from './rcvDataExtractor.js';
import {
  extractNutritionalStatus, extractClinicalFlags, extractVaccineStatus,
  extractVaccinationDates, extractMicronutrients, extractDesparasitante,
  extractProximoControl, detectTipoInscripcion, calculateAge, matchNumber
} from './pediatricExtractionHelpers.js';

export class PediatricDataExtractor {
  constructor(pdfPath, programa) {
    this.pdfPath = pdfPath;
    this.programa = programa;
    this.processor = new PDFProcessor(pdfPath);
    this.text = null;
  }

  async extract(fechaAtencion, nombremedico) {
    if (!this.text) {
      this.text = await this.processor.extractText();
    }

    const demographics = this.extractDemographics();
    const vitals = this.extractVitalSigns();
    const perimetros = this.extractPerimetros();
    const acudiente = this.extractAcudiente();
    const edad = calculateAge(demographics.fechaNacimiento, fechaAtencion);
    const tipo = detectTipoInscripcion(this.text);

    return {
      fecha: fechaAtencion,
      tipoInscripcion1aVez: tipo === '1aVez' ? 'X' : '',
      tipoInscripcionControl: tipo === 'control' ? 'X' : '',
      medicoEnfermera: nombremedico || '',
      ...demographics,
      acudiente,
      edadConsulta: edad,
      ...vitals,
      ...perimetros,
      estadoNutricional: extractNutritionalStatus(this.text, vitals),
      ...extractClinicalFlags(this.text),
      esquemaVacunal: extractVaccineStatus(this.text),
      ...extractVaccinationDates(this.text, this.programa),
      ...extractMicronutrients(this.text, this.programa),
      desparasitante: extractDesparasitante(this.text),
      observaciones: '',
      proximoControl: extractProximoControl(this.text)
    };
  }

  extractDemographics() {
    const t = this.text;
    const data = {};

    const nameMatch = t.match(/Nombre del paciente:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s*-\s*(\d+)/i);
    if (nameMatch) {
      const parsed = parseColombianName(nameMatch[1].trim());
      data.primerApellido = parsed.apellido1;
      data.segundoApellido = parsed.apellido2;
      data.primerNombre = parsed.nombre1;
      data.segundoNombre = parsed.nombre2;
    }

    const idMatch = t.match(/identificaci[oó]n:\s*(CC|TI|CE|PA|RC|PT|NV)\s*(\d+)/i);
    if (idMatch) {
      data.tipoIdentificacion = idMatch[1].toUpperCase();
      data.numeroIdentificacion = idMatch[2];
    }

    const dirAnalisis = t.match(/DIRECCI[OÓ]N:\s*([A-Za-z0-9ÁÉÍÓÚáéíóúÑñ#\-–—\s,.ª]+?)\s+(?:BARRIO|TEL[ÉE]FONO)/i);
    const dirDemog = t.match(/Direcci[oó]n:\s*(.+?)\s+Tel[eé]fono/i);
    const dirSource = dirAnalisis || dirDemog;
    if (dirSource) data.direccionResidencia = dirSource[1].trim();

    const telMatch = t.match(/Tel[eé]fono:\s*(\d+)/i);
    if (telMatch) data.telefonos = telMatch[1];

    const fechaNacMatch = t.match(/Fecha nacimiento:\s*(\d{4}-\d{2}-\d{2})/i);
    if (fechaNacMatch) data.fechaNacimiento = fechaNacMatch[1];

    const sexoMatch = t.match(/Sexo:\s*([MF])/i);
    if (sexoMatch) data.sexo = sexoMatch[1].toUpperCase();

    const etniaMatch = t.match(/ETNIA[:\s]+(MESTIZO|AFRO|INDIGENA|AFROCOLOMBIANO)/i);
    data.etnia = etniaMatch ? etniaMatch[1].toUpperCase() : 'MESTIZO';

    const discMatch = t.match(/Tipo de discapacidad:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s+Identidad/i);
    data.tipoDiscapacidad = discMatch ? discMatch[1].trim() : 'NO APLICA';

    return data;
  }

  extractAcudiente() {
    const t = this.text;
    const patterns = [
      /NOMBRE DEL ACUDIENTE:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)(?:\s+CC|\s+MENOR|\s+PACIENTE|\n)/i,
      /NOMBRE DEL ACUDIENTE:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s()]+?)(?:\s+MENOR|\s+PACIENTE|\n)/i,
      /(?:COMPAÑÍA DE|ACOMPAÑ[AO] DE)\s+(?:SU\s+)?(?:MADRE|PADRE|TIA|TIO|ABUELA|ABUELO|TUTORA?)\s+([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)(?:\s+CC|\s*,|\s+PARA|\s+A\s+CONTROL)/i
    ];

    for (const pattern of patterns) {
      const match = t.match(pattern);
      if (match) {
        const cleaned = cleanAcudienteName(match[1]);
        if (cleaned) return cleaned;
      }
    }

    const alt = t.match(/NOMBRE DEL ACUDIENTE:\s*(.+?)(?:\s+MENOR|\s+PACIENTE)/i);
    if (alt) {
      const cleaned = cleanAcudienteName(alt[1]);
      if (cleaned) return cleaned;
    }

    return '';
  }

  extractVitalSigns() {
    const t = this.text;
    const data = {};

    const peso = matchNumber(t, /PESO\s*\(KG\)\s*(\d+(?:\.\d+)?)/i);
    if (peso !== null) data.pesoKg = peso;

    const talla = matchNumber(t, /TALLA\s*\(CM\)(?:\s*EJM:\s*\d+\.\d+)?\s*(\d+(?:\.\d+)?)/i);
    if (talla !== null) data.tallaCm = talla;

    const imc = matchNumber(t, /IMC\s*(\d+(?:\.\d+)?)/i);
    if (imc !== null) {
      data.imc = imc;
    } else if (data.pesoKg && data.tallaCm) {
      const h = data.tallaCm / 100;
      data.imc = parseFloat((data.pesoKg / (h * h)).toFixed(2));
    }

    return data;
  }

  extractPerimetros() {
    const t = this.text;
    return {
      perimetroCefalico: matchNumber(t, /PER[IÍ]METRO\s+CEF[AÁ]LICO[:\s]+(\d+)\s*(?:CM)?/i) ?? '',
      perimetroBraquial: matchNumber(t, /PER[IÍ]METRO\s+BRAQUIAL[:\s]+(\d+)\s*(?:CM)?/i) ?? '',
      perimetroAbdominal: matchNumber(t, /PER[IÍ]METRO\s+ABDOMINAL[:\s]+(\d+)\s*(?:CM)?/i) ?? ''
    };
  }
}

function cleanAcudienteName(raw) {
  let name = raw.trim();
  const inParens = name.match(/\(([^)]+)\)/);
  if (inParens) name = inParens[1].trim();
  name = name.replace(/\s*CC\s*\d+/i, '').trim();
  name = name.replace(/\s*Y\s+[A-Z]+\s+[A-Z]+$/i, '');
  name = name.replace(/^(?:MADRE|PADRE|TIA|TIO|ABUELA|ABUELO|TUTORA?)\s*/i, '');
  return name ? name.toUpperCase() : '';
}

export async function extractPediatricDataFromPDF(pdfPath, programa, fechaAtencion, nombremedico) {
  const extractor = new PediatricDataExtractor(pdfPath, programa);
  return extractor.extract(fechaAtencion, nombremedico);
}
