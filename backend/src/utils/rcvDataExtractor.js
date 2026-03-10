import { PDFProcessor } from './pdfProcessor.js';
import { logger } from './logger.js';

const PREPOSITIONS = ['de la', 'de los', 'de las', 'del', 'de'];

const THRESHOLDS = {
  colesterolTotal: 200,
  ldl: 130,
  hdlMen: 40,
  hdlWomen: 50,
  trigliceridos: 150,
  glucosa: 126,
  hba1c: 6.5,
  creatininaMen: 1.3,
  creatininaWomen: 1.1,
  paSystolic: 140,
  paDiastolic: 90
};

export class RCVDataExtractor {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.processor = new PDFProcessor(pdfPath);
    this.text = null;
  }

  async extract(fechaAtencion) {
    if (!this.text) {
      this.text = await this.processor.extractText();
    }

    const demographics = this.extractDemographics();
    const vitals = this.extractVitalSigns();
    const textConditions = this.extractTextConditions();
    const labs = this.extractLabResults();
    const conditions = this.inferConditions(textConditions, labs, demographics.sexo, vitals);
    const perimetro = this.extractPerimetro();
    const tipo = this.detectTipoInscripcion();

    return {
      fecha: fechaAtencion,
      tipoInscripcion1aVez: tipo === '1aVez' ? 'X' : '',
      tipoInscripcionControl: tipo === 'control' ? 'X' : '',
      ...demographics,
      ...vitals,
      ...conditions,
      presionArterial: vitals.presionArterial || '',
      presionArterialAnterior: '',
      ...labs,
      ...perimetro
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

    const idMatch = t.match(/identificaci[oó]n:\s*(CC|TI|CE|PA|RC|PT)\s*(\d+)/i);
    if (idMatch) {
      data.tipoIdentificacion = idMatch[1].toUpperCase();
      data.numeroIdentificacion = idMatch[2];
    }

    const dirAnalisis = t.match(/DIRECCI[OÓ]N:\s*([A-Za-z0-9ÁÉÍÓÚáéíóúÑñ#\-–—\s,.]+?)\s+TEL[ÉE]FONO/i);
    const dirDemog = t.match(/Direcci[oó]n:\s*(.+?)\s+Tel[eé]fono/i);
    const dirSource = dirAnalisis || dirDemog;
    if (dirSource) data.direccionResidencia = dirSource[1].trim();

    const telMatch = t.match(/Tel[eé]fono:\s*(\d+)/i);
    if (telMatch) data.telefonos = telMatch[1];

    const fechaNacMatch = t.match(/Fecha nacimiento:\s*(\d{4}-\d{2}-\d{2})/i);
    if (fechaNacMatch) data.fechaNacimiento = fechaNacMatch[1];

    const edadMatch = t.match(/Edad:\s*(\d+)/i);
    data.edadConsulta = edadMatch ? parseInt(edadMatch[1]) : '';

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

    const pa = t.match(/PRESION ARTERIAL\s*\(MM HG\)\s*(\d+\/\d+)/i)
            || t.match(/PRESION ARTERIAL[:\s]+(\d+\/\d+)/i)
            || t.match(/PA[:\s]+(\d{2,3}\/\d{2,3})/i);
    if (pa) data.presionArterial = pa[1];

    const fc = matchNumber(t, /FRECUENCIA CARDIACA\s*\(PPM\)\s*(\d+)/i)
            ?? matchNumber(t, /FC[:\s]+(\d+)/i);
    if (fc !== null) data.frecuenciaCardiaca = fc;

    const fr = matchNumber(t, /FRECUENCIA RESPIRATORIA\s*(\d+)/i)
            ?? matchNumber(t, /FR[:\s]+(\d+)/i);
    if (fr !== null) data.frecuenciaRespiratoria = fr;

    const temp = matchNumber(t, /TEMPERATURA\s*(\d+(?:\.\d+)?)/i)
              ?? matchNumber(t, /TEMPERATURA\s*(?:\n.*?)?(\d{2}(?:\.\d+)?)\s+PESO/i);
    if (temp !== null) data.temperatura = temp;

    return data;
  }

  extractTextConditions() {
    const t = this.text;
    return {
      ht: extractConditionFlag(t, /HIPERTENSO[:\s]+(SI|NO)/i),
      dm: extractConditionFlag(t, /DIABETICO[:\s]+(SI|NO)/i)
        || extractConditionFlag(t, /DM[:\s]+(SI|NO)/i),
      erc: extractConditionFlag(t, /ERC[:\s]+(SI|NO)/i)
        || extractConditionFlag(t, /ENFERMEDAD RENAL[:\s]+(SI|NO)/i),
      dislipidemia: extractConditionFlag(t, /DISLIPIDEMIA[:\s]+(SI|NO)/i)
    };
  }

  extractLabResults() {
    const t = this.text;
    const mainDate = this.extractMainLabDate();
    const data = {};

    const hdl = matchNumber(t, /HDL[:\s]+(\d+(?:\.\d+)?)/i);
    if (hdl !== null) {
      data.fechaLabHdl = mainDate;
      data.hdl = hdl;
    }

    const ldl = matchNumber(t, /LDL[:\s]+(\d+(?:\.\d+)?)/i);
    if (ldl !== null) {
      data.fechaLabLdl = mainDate;
      data.ldl = ldl;
    }

    const ct = matchNumber(t, /COLESTEROL TOTAL[:\s]+(\d+(?:\.\d+)?)/i);
    if (ct !== null) {
      data.fechaLabCt = mainDate;
      data.colesterolTotal = ct;
    }

    const tg = matchNumber(t, /TRIGL[IÍ]C[EÉ]RIDOS[:\s]+(\d+(?:\.\d+)?)/i);
    if (tg !== null) {
      data.fechaLabTg = mainDate;
      data.trigliceridos = tg;
    }

    const glu = matchNumber(t, /GLUCOSA[:\s]+(\d+(?:\.\d+)?)/i);
    if (glu !== null) {
      data.fechaLabGlucosa = mainDate;
      data.glucosa = glu;
    }

    const crea = matchNumber(t, /CREATININA[:\s]+(\d+(?:\.\d+)?)/i);
    if (crea !== null) {
      data.fechaLabCreatinina = mainDate;
      data.creatinina = crea;
    }

    const uroResult = this.extractUroanalisis();
    if (uroResult.value) {
      data.fechaLabUroanalisis = mainDate;
      data.uroanalisis = uroResult.value;
    }

    const psaData = this.extractPSA(mainDate);
    if (psaData) {
      data.fechaLabPsa = psaData.fecha;
      data.psa = psaData.value;
    }

    const soData = this.extractSangreOculta(mainDate);
    if (soData) {
      data.fechaLabSangreOculta = soData.fecha;
      data.sangreOculta = soData.value;
    }

    const hb = matchNumber(t, /HB[:\s]+(\d+(?:\.\d+)?)/i);
    if (hb !== null) {
      data.fechaLabHemograma = mainDate;
      data.hemograma = hb;
    }

    const hba1c = matchNumber(t, /HBA1C[:\s]+(\d+(?:\.\d+)?)\s*%/i)
              ?? matchNumber(t, /HEMOGLOBINA GLICOSILADA[:\s]+(\d+(?:\.\d+)?)/i);
    if (hba1c !== null) {
      data.fechaLabHba1c = mainDate;
      data.hba1c = hba1c;
    }

    return data;
  }

  extractMainLabDate() {
    const dateMatch = this.text.match(/--(\d{2})\/(\d{2})\/(\d{2})\s/);
    if (!dateMatch) return '';
    return convertLabDate(dateMatch[1], dateMatch[2], dateMatch[3]);
  }

  extractPSA(fallbackDate) {
    const t = this.text;
    const withDate = t.match(/(?:FECHA\s+Y\s+RESULTADO\s+)?PSA[:\s]+(\d{2})\/(\d{2})\/(\d{2})\s+(\d+(?:\.\d+)?)/i);
    if (withDate) {
      return {
        fecha: convertLabDate(withDate[1], withDate[2], withDate[3]),
        value: parseFloat(withDate[4])
      };
    }

    const simple = matchNumber(t, /PSA[:\s]+(\d+(?:\.\d+)?)/i);
    if (simple !== null) {
      return { fecha: fallbackDate, value: simple };
    }

    return null;
  }

  extractSangreOculta(fallbackDate) {
    const t = this.text;
    const match = t.match(/SANGRE OCULTA EN HECES[:\s]+(NEGATIVO|POSITIVO)/i);
    if (!match) return null;
    return { fecha: fallbackDate, value: match[1].toUpperCase() };
  }

  extractUroanalisis() {
    const t = this.text;
    const pathological = [
      'GLUCOSURIA', 'HEMATURIA', 'PROTEINURIA', 'BACTERIURIA',
      'LEUCOCITURIA', 'PIURIA', 'CRISTALURIA'
    ];

    const uroSection = t.match(/(?:PARCIAL DE ORINA|UROANALISIS)[:\s]+([^.]{0,200})/i);
    if (!uroSection) return { value: '' };

    const section = uroSection[1].toUpperCase();
    const isPathological = pathological.some(p => section.includes(p));
    return { value: isPathological ? 'PATOLOGICO' : 'NO PATOLOGICO' };
  }

  extractPerimetro() {
    const match = matchNumber(this.text, /PER[IÍ]METRO ABDOMINAL[:\s]+(\d+)\s*(?:CM)?/i);
    return {
      tomaPerimetro: match !== null ? '' : '',
      perimetroAbdominal: match ?? ''
    };
  }

  detectTipoInscripcion() {
    const t = this.text;

    const control = [
      /CONTINUAR\s+CONTROL/i,
      /CONTROL\s+(?:DE\s+)?(?:RCV|PROGRAMA)/i,
      /CONSULTA\s+DE\s+(?:CONTROL|SEGUIMIENTO)/i,
      /PARA\s+CONTROL/i
    ];

    for (const p of control) {
      if (p.test(t)) return 'control';
    }

    const primeraVez = [
      /INGRES[OA]\s+(?:NUEV[OA]|POR\s+PRIMERA)/i,
      /PRIMER\s+INGRESO/i,
      /1[°º]\s*VEZ/i,
      /PRIMERA\s+VEZ\s+(?:EN|AL|A)\s+(?:PROGRAMA|RCV|CONTROL)/i
    ];

    for (const p of primeraVez) {
      if (p.test(t)) return '1aVez';
    }

    return 'control';
  }

  inferConditions(textConds, labs, sexo, vitals) {
    const isMale = sexo === 'M';

    const htFromLabs = this.inferHT(vitals);
    const dmFromLabs = this.inferDM(labs);
    const ercFromLabs = this.inferERC(labs, isMale);
    const dislipidemiaFromLabs = this.inferDislipidemia(labs, isMale);

    return {
      ht: resolveCondition(textConds.ht, htFromLabs),
      dm: resolveCondition(textConds.dm, dmFromLabs),
      erc: resolveCondition(textConds.erc, ercFromLabs),
      dislipidemia: resolveCondition(textConds.dislipidemia, dislipidemiaFromLabs)
    };
  }

  inferHT(vitals) {
    if (!vitals.presionArterial) return null;
    const parts = vitals.presionArterial.split('/');
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);
    return sys >= THRESHOLDS.paSystolic || dia >= THRESHOLDS.paDiastolic;
  }

  inferDM(labs) {
    if (labs.glucosa >= THRESHOLDS.glucosa) return true;
    if (labs.hba1c >= THRESHOLDS.hba1c) return true;
    return null;
  }

  inferERC(labs, isMale) {
    if (!labs.creatinina) return null;
    const threshold = isMale ? THRESHOLDS.creatininaMen : THRESHOLDS.creatininaWomen;
    return labs.creatinina > threshold;
  }

  inferDislipidemia(labs, isMale) {
    if (labs.colesterolTotal > THRESHOLDS.colesterolTotal) return true;
    if (labs.ldl > THRESHOLDS.ldl) return true;
    if (labs.trigliceridos > THRESHOLDS.trigliceridos) return true;
    const hdlThreshold = isMale ? THRESHOLDS.hdlMen : THRESHOLDS.hdlWomen;
    if (labs.hdl && labs.hdl < hdlThreshold) return true;
    return null;
  }
}

function resolveCondition(textValue, inferredValue) {
  if (inferredValue === true) return 'X';
  if (textValue === true) return 'X';
  if (textValue === false) return 'NO';
  if (inferredValue === false) return 'NO';
  return 'NO';
}

function extractConditionFlag(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  const val = match[1].toUpperCase().trim();
  if (val === 'SI' || val.startsWith('SI')) return true;
  if (val === 'NO') return false;
  return null;
}

function matchNumber(text, pattern) {
  const match = text.match(pattern);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

function convertLabDate(day, month, year) {
  const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
  return `${fullYear}-${month}-${day}`;
}

export function parseColombianName(fullName) {
  const words = fullName.trim().split(/\s+/);
  const groups = groupPrepositions(words);

  const result = { nombre1: '', nombre2: '', apellido1: '', apellido2: '' };

  if (groups.length === 0) return result;
  if (groups.length === 1) {
    result.nombre1 = groups[0].toUpperCase();
    return result;
  }
  if (groups.length === 2) {
    result.nombre1 = groups[0].toUpperCase();
    result.apellido1 = groups[1].toUpperCase();
    return result;
  }
  if (groups.length === 3) {
    result.nombre1 = groups[0].toUpperCase();
    result.apellido1 = groups[1].toUpperCase();
    result.apellido2 = groups[2].toUpperCase();
    return result;
  }

  const apellido2 = groups.pop();
  const apellido1 = groups.pop();
  result.apellido1 = apellido1.toUpperCase();
  result.apellido2 = apellido2.toUpperCase();
  result.nombre1 = groups[0].toUpperCase();
  result.nombre2 = groups.slice(1).join(' ').toUpperCase();

  return result;
}

function groupPrepositions(words) {
  const groups = [];
  let i = 0;

  while (i < words.length) {
    let matched = false;
    for (const prep of PREPOSITIONS) {
      const prepWords = prep.split(' ');
      const slice = words.slice(i, i + prepWords.length).map(w => w.toLowerCase());
      if (slice.join(' ') === prep && i + prepWords.length < words.length) {
        const combined = words.slice(i, i + prepWords.length + 1).join(' ');
        groups.push(combined);
        i += prepWords.length + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      groups.push(words[i]);
      i++;
    }
  }

  return groups;
}

export async function extractRCVDataFromPDF(pdfPath, fechaAtencion) {
  const extractor = new RCVDataExtractor(pdfPath);
  return extractor.extract(fechaAtencion);
}
