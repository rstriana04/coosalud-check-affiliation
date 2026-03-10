import { PDFProcessor } from './pdfProcessor.js';
import { parseColombianName } from './rcvDataExtractor.js';
import { matchNumber } from './pediatricExtractionHelpers.js';
import { extractEdadNumeric } from './lifecycleExtractionHelpers.js';
import {
  extractMethodColumns, classifyVisitType, classifyProfessionalType,
  extractEfectoColateral, extractUltimaCitologia, extractProximoControl,
  extractAnalisisAddress, extractAnalisisPhone
} from './planificacionFamiliarExtractionHelpers.js';

export class PlanificacionFamiliarDataExtractor {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.processor = new PDFProcessor(pdfPath);
    this.text = null;
  }

  async extract(fechaAtencion, nombremedico) {
    if (!this.text) {
      this.text = await this.processor.extractText();
    }

    const demographics = this.extractDemographics();
    const vitals = this.extractVitalSigns();
    const methodColumns = extractMethodColumns(this.text);

    return {
      fecha: fechaAtencion,
      medicoEnfermera: classifyProfessionalType(this.text),
      ...demographics,
      edad: extractEdadNumeric(this.text) || '',
      ...vitals,
      visitType: classifyVisitType(this.text),
      ...methodColumns,
      fechaUltimoControl: fechaAtencion,
      efectoColateral: extractEfectoColateral(this.text),
      ultimaCitologia: extractUltimaCitologia(this.text),
      observaciones: '',
      proximoControl: extractProximoControl(this.text, fechaAtencion)
    };
  }

  extractDemographics() {
    const t = this.text;
    const data = {};

    const nameMatch = t.match(
      /Nombre del paciente:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s*-\s*(\d+)/i
    );
    if (nameMatch) {
      const parsed = parseColombianName(nameMatch[1].trim());
      data.primerApellido = parsed.apellido1;
      data.segundoApellido = parsed.apellido2;
      data.primerNombre = parsed.nombre1;
      data.segundoNombre = parsed.nombre2;
    }

    const idMatch = t.match(
      /identificaci[oó]n:\s*(CC|TI|CE|PA|RC|PT|PE|NV)\s*(\d+)/i
    );
    if (idMatch) {
      data.tipoIdentificacion = idMatch[1].toUpperCase();
      data.numeroIdentificacion = idMatch[2];
    }

    const analysisAddr = extractAnalisisAddress(t);
    const demoAddr = t.match(/Direcci[oó]n:\s*(.+?)\s+Tel[eé]fono/i);
    data.direccionResidencia = analysisAddr
      || (demoAddr ? demoAddr[1].trim().toUpperCase() : '');

    const analysisPhone = extractAnalisisPhone(t);
    const demoPhone = t.match(/Tel[eé]fono:\s*(\d+)/i);
    data.telefonos = analysisPhone || (demoPhone ? demoPhone[1] : '');

    const sexoMatch = t.match(/Sexo:\s*([MF])/i);
    if (sexoMatch) data.sexo = sexoMatch[1].toUpperCase();

    return data;
  }

  extractVitalSigns() {
    const t = this.text;
    const data = {};

    const peso = matchNumber(t, /PESO\s*\(KG\)\s*(\d+(?:\.\d+)?)/i);
    if (peso !== null) data.pesoKg = peso;

    const talla = matchNumber(
      t, /TALLA\s*\(CM\)(?:\s*EJM:\s*\d+\.\d+)?\s*(\d+(?:\.\d+)?)/i
    );
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
}
