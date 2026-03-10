import { PDFProcessor } from './pdfProcessor.js';
import { parseColombianName } from './rcvDataExtractor.js';
import { matchNumber } from './pediatricExtractionHelpers.js';
import { extractEdadNumeric } from './lifecycleExtractionHelpers.js';
import {
  extractFechaUltimaMenstruacion,
  extractFechaUltimaCitologia,
  classifyCitologiaVisitType,
  extractResultadoAnterior,
  extractProcedimientosCuello,
  extractMetodoPlanificacion,
  extractOcupacion,
  extractEscolaridad,
  extractDocumentType
} from './citologiasExtractionHelpers.js';

export class CitologiasDataExtractor {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.processor = new PDFProcessor(pdfPath);
  }

  async extract(fechaAtencion, nombremedico) {
    this.text = await this.processor.extractText();
    const demographics = this.extractDemographics();
    const vitals = this.extractVitalSigns();
    const edad = extractEdadNumeric(this.text);
    const docType = extractDocumentType(this.text);
    const ocupacion = extractOcupacion(this.text);
    const escolaridad = extractEscolaridad(this.text);
    const fum = extractFechaUltimaMenstruacion(this.text);
    const fechaUltimaCitologia = extractFechaUltimaCitologia(this.text);
    const visitType = classifyCitologiaVisitType(this.text, fechaUltimaCitologia);
    const resultadoAnterior = extractResultadoAnterior(this.text);
    const procedimientos = extractProcedimientosCuello(this.text);
    const metodoPlanificacion = extractMetodoPlanificacion(this.text);

    return {
      fecha: fechaAtencion,
      medicoEnfermera: nombremedico,
      ...demographics,
      edad,
      docType,
      ...vitals,
      ocupacion,
      escolaridad,
      fum,
      ...visitType,
      fechaUltimaCitologia,
      ...resultadoAnterior,
      ...procedimientos,
      metodoPlanificacion,
      fechaTomaCitologia: fechaAtencion
    };
  }

  extractDemographics() {
    const nameMatch = this.text.match(/Nombre del paciente:\s*(.+?)\s*-\s*(\d+)/i);
    let primerApellido = '', segundoApellido = '', primerNombre = '', segundoNombre = '';
    let identificacion = '';

    if (nameMatch) {
      const parsed = parseColombianName(nameMatch[1].trim());
      primerApellido = parsed.apellido1;
      segundoApellido = parsed.apellido2;
      primerNombre = parsed.nombre1;
      segundoNombre = parsed.nombre2;
      identificacion = nameMatch[2];
    }

    const fechaNacimiento = this.text.match(/Fecha\s+nacimiento:\s*(\d{4}-\d{2}-\d{2})/i)?.[1] || '';

    const addrAnalisis = this.text.match(/DIRECCI[OÓ]N(?:\s+DE\s+RESIDENCIA)?[;:\s]+(.+?)(?:\s+TEL[EÉ]FONO|\s+BARRIO|\n|$)/i);
    const addrDemo = this.text.match(/Direcci[oó]n:\s*(.+?)(?:\s+Tel|\s+Fecha|$)/i);
    const direccion = (addrAnalisis?.[1] || addrDemo?.[1] || '').trim();

    const phoneAnalisis = this.text.match(/TEL[EÉ]FONO(?:S)?[;:\s]+(\d+)/i);
    const phoneDemo = this.text.match(/Tel[eé]fono:\s*(\d+)/i);
    const telefono = phoneAnalisis?.[1] || phoneDemo?.[1] || '';

    return {
      primerApellido, segundoApellido, primerNombre, segundoNombre,
      identificacion, fechaNacimiento, direccion, telefono
    };
  }

  extractVitalSigns() {
    const peso = matchNumber(this.text, /PESO\s*\(?KG\)?\s*(\d+(?:\.\d+)?)/i);
    const talla = matchNumber(this.text, /TALLA\s*\(?CM\)?(?:\s*EJM:\s*\d+\.\d+)?\s*(\d+(?:\.\d+)?)/i);
    return { peso: peso || '', talla: talla || '' };
  }
}
