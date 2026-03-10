import { PDFProcessor } from './pdfProcessor.js';
import { parseColombianName } from './rcvDataExtractor.js';
import { matchNumber } from './pediatricExtractionHelpers.js';
import {
  classifyIMC, extractOrientacionSexual, extractIdentidadGenero,
  extractAntecedentesFamiliares, extractAntecedentesPersonales,
  extractDiscapacidad, extractConsumoSustancias, extractConsumoTabaco,
  extractConsumoAlcohol, extractPlanificacionFamiliar, extractCitologiaFecha,
  extractMamografiaFecha, extractTactoRectal, extractSifilis, extractVIH,
  extractLifecycleLabDate, extractEdadNumeric
} from './lifecycleExtractionHelpers.js';

export class LifecycleDataExtractor {
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
    const labs = this.extractLabResults();
    const edadNum = extractEdadNumeric(this.text);

    return {
      fecha: fechaAtencion,
      medicoEnfermera: nombremedico || '',
      ...demographics,
      edadConsulta: edadNum ? `${edadNum} AÑOS` : '',
      orientacionSexual: extractOrientacionSexual(this.text),
      identidadGenero: extractIdentidadGenero(this.text),
      antecedentesFamiliares: extractAntecedentesFamiliares(this.text),
      antecedentesPersonales: extractAntecedentesPersonales(this.text),
      discapacidad: extractDiscapacidad(this.text),
      consumoSustancias: extractConsumoSustancias(this.text),
      consumoTabaco: extractConsumoTabaco(this.text),
      consumoAlcohol: extractConsumoAlcohol(this.text),
      ...vitals,
      clasificacionImc: classifyIMC(vitals.imc),
      planificacionFamiliar: extractPlanificacionFamiliar(this.text),
      fechaCitologia: extractCitologiaFecha(this.text),
      fechaMamografia: extractMamografiaFecha(this.text),
      tactoRectal: extractTactoRectal(this.text, demographics.sexo, edadNum),
      ...labs,
      observaciones: this.buildObservaciones(labs)
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

    const idMatch = t.match(/identificaci[oó]n:\s*(CC|TI|CE|PA|RC|PT|PE|NV)\s*(\d+)/i);
    if (idMatch) {
      data.tipoIdentificacion = idMatch[1].toUpperCase();
      data.numeroIdentificacion = idMatch[2];
    }

    const dirAnalisis = t.match(/DIRECCI[OÓ]N:\s*([A-Za-z0-9ÁÉÍÓÚáéíóúÑñ#\-–—\s,.ª]+?)\s+(?:BARRIO|TEL[ÉE]FONO)/);
    const dirDemog = t.match(/Direcci[oó]n:\s*(.+?)\s+Tel[eé]fono/i);
    const dirSource = dirAnalisis || dirDemog;
    if (dirSource) data.direccionResidencia = dirSource[1].trim().toUpperCase();

    const telMatch = t.match(/Tel[eé]fono:\s*(\d+)/i);
    if (telMatch) data.telefonos = telMatch[1];

    const fechaNacMatch = t.match(/Fecha nacimiento:\s*(\d{4}-\d{2}-\d{2})/i);
    if (fechaNacMatch) data.fechaNacimiento = fechaNacMatch[1];

    const sexoMatch = t.match(/Sexo:\s*([MF])/i);
    if (sexoMatch) data.sexo = sexoMatch[1].toUpperCase();

    return data;
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

    const pa = t.match(/PRESION ARTERIAL\s*\(MM\s*HG\)\s*(\d+\/\d+)/i)
      || t.match(/PRESION ARTERIAL[:\s]+(\d+\/\d+)/i)
      || t.match(/(\d{2,3}\/\d{2,3})\s*MMHG/i);
    if (pa) data.tensionArterial = pa[1];

    const perimAbd = matchNumber(t, /PER[IÍ]METRO\s+ABDOMINAL[:\s]+(\d+)\s*(?:CM)?/i);
    if (perimAbd !== null) data.perimetroAbdominal = `${perimAbd}CM`;

    return data;
  }

  extractLabResults() {
    const t = this.text;
    const mainDate = extractLifecycleLabDate(t);
    const data = {};
    const hasLabs = mainDate !== '' || /HEMOGRAMA|GLICEMIA|PERFIL\s+LIP[IÍ]DICO/i.test(t);

    if (!hasLabs) return data;

    const hb = matchNumber(t, /HB[:\s]+(\d+(?:\.\d+)?)/i);
    if (hb !== null) { data.hemograma = hb; data.fechaLabHemograma = mainDate; }

    const hdl = matchNumber(t, /HDL[;:\s]*(\d+(?:\.\d+)?)/i);
    if (hdl !== null) { data.hdl = hdl; data.fechaLabHdl = mainDate; }

    const ldl = matchNumber(t, /LDL[:\s]*(\d+(?:\.\d+)?)/i);
    if (ldl !== null) { data.ldl = ldl; data.fechaLabLdl = mainDate; }

    const ct = matchNumber(t, /COLESTEROL\s+TOTAL[:\s]+(\d+(?:\.\d+)?)/i)
      ?? matchNumber(t, /\bCT[:\s]+(\d+(?:\.\d+)?)/i);
    if (ct !== null) { data.colesterolTotal = ct; data.fechaLabCt = mainDate; }

    const tg = matchNumber(t, /TRIGL[IÍ]C[EÉ]RIDOS[:\s]+(\d+(?:\.\d+)?)/i)
      ?? matchNumber(t, /\bTGC?[:\s]+(\d+(?:\.\d+)?)/i);
    if (tg !== null) { data.trigliceridos = tg; data.fechaLabTg = mainDate; }

    const glu = matchNumber(t, /GLICEMIA[:\s]+(\d+(?:\.\d+)?)/i)
      ?? matchNumber(t, /GLUCOSA[:\s]+(\d+(?:\.\d+)?)/i);
    if (glu !== null) { data.glucosa = glu; data.fechaLabGlucosa = mainDate; }

    const crea = matchNumber(t, /CREATININA[:\s]+(\d+(?:\.\d+)?)/i);
    if (crea !== null) { data.creatinina = crea; data.fechaLabCreatinina = mainDate; }

    if (mainDate) {
      data.uroanalisis = this.extractUroanalisis();
      if (data.uroanalisis) data.fechaLabUroanalisis = mainDate;
    }

    const sifilis = extractSifilis(t);
    if (sifilis !== '-') { data.sifilis = sifilis; data.fechaLabSifilis = mainDate; }

    const vih = extractVIH(t);
    if (vih !== '-') { data.vih = vih; data.fechaLabVih = mainDate; }

    const psa = matchNumber(t, /PSA[:\s]+(\d+(?:\.\d+)?)/i);
    if (psa !== null) { data.psa = psa; data.fechaLabPsa = mainDate; }

    const so = t.match(/SANGRE\s+OCULTA[:\s]+(NEGATIVO|POSITIVO)/i);
    if (so) { data.sangreOculta = so[1].toUpperCase(); data.fechaLabSangreOculta = mainDate; }

    return data;
  }

  extractUroanalisis() {
    const t = this.text;
    const pathological = [
      'GLUCOSURIA', 'HEMATURIA', 'PROTEINURIA', 'BACTERIURIA',
      'LEUCOCITURIA', 'PIURIA', 'CRISTALURIA'
    ];
    const section = t.match(/(?:PARCIAL DE ORINA|UROANALISIS)[:\s]+([^.]{0,300})/i);
    if (!section) return '';
    const upper = section[1].toUpperCase();
    return pathological.some(p => upper.includes(p)) ? 'PATOLOGICO' : 'NO PATOLOGICO';
  }

  buildObservaciones(labs) {
    const hasAnyLab = Object.keys(labs).some(k => !k.startsWith('fecha'));
    return hasAnyLab ? '' : 'EXAMENES NO REALIZADOS';
  }
}
