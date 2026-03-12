import {
  normalizeDate, safeParseFloat, safeParseInt, setIfPresent,
} from './resolucion202Mapper.js';

export function mapRcvData(data) {
  const record = {};

  mapVitals(record, data);
  mapLipidPanel(record, data);
  mapGlucoseAndCreatinine(record, data);
  mapHemoglobin(record, data);
  mapPsaAndSangreOculta(record, data);
  mapRiskClassification(record, data);

  return record;
}

function mapVitals(record, data) {
  const fecha = normalizeDate(data.fecha);
  setIfPresent(record, 'fecha_peso', fecha);
  setIfPresent(record, 'fecha_talla', fecha);
  setIfPresent(record, 'fecha_consulta_valoracion_integral', fecha);

  const peso = safeParseFloat(data.pesoKg);
  setIfPresent(record, 'peso_kilogramos', peso);

  const talla = safeParseInt(data.tallaCm);
  setIfPresent(record, 'talla_centimetros', talla);
}

function mapLipidPanel(record, data) {
  const hdl = safeParseInt(data.hdl);
  if (hdl !== null) {
    setIfPresent(record, 'fecha_toma_hdl', normalizeDate(data.fechaLabHdl));
    record.resultado_hdl = hdl;
  }

  const ldl = safeParseInt(data.ldl);
  if (ldl !== null) {
    setIfPresent(record, 'fecha_toma_ldl', normalizeDate(data.fechaLabLdl));
    record.resultado_ldl = ldl;
  }

  const tg = safeParseInt(data.trigliceridos);
  if (tg !== null) {
    setIfPresent(record, 'fecha_toma_trigliceridos', normalizeDate(data.fechaLabTg));
    record.resultado_trigliceridos = tg;
  }
}

function mapGlucoseAndCreatinine(record, data) {
  const glucosa = safeParseInt(data.glucosa);
  if (glucosa !== null) {
    setIfPresent(record, 'fecha_toma_glicemia_basal', normalizeDate(data.fechaLabGlucosa));
    record.resultado_glicemia_basal = glucosa;
  }

  const creatinina = safeParseFloat(data.creatinina);
  if (creatinina !== null) {
    setIfPresent(record, 'fecha_toma_creatinina', normalizeDate(data.fechaLabCreatinina));
    record.resultado_creatinina = creatinina;
  }
}

function mapHemoglobin(record, data) {
  const hb = safeParseFloat(data.hemograma);
  if (hb !== null) {
    setIfPresent(record, 'fecha_toma_hemoglobina', normalizeDate(data.fechaLabHemograma));
    record.resultado_hemoglobina = hb;
  }
}

function mapPsaAndSangreOculta(record, data) {
  const psa = safeParseFloat(data.psa);
  if (psa !== null) {
    setIfPresent(record, 'fecha_toma_psa', normalizeDate(data.fechaLabPsa));
    record.resultado_psa = psa;
  }

  if (data.sangreOculta) {
    setIfPresent(record, 'fecha_sangre_oculta_fecal', normalizeDate(data.fechaLabSangreOculta));
    record.resultado_sangre_oculta_fecal = encodeSangreOculta(data.sangreOculta);
  }
}

function mapRiskClassification(record, data) {
  const hasDislipidemia = data.dislipidemia === 'X';
  const hasHT = data.ht === 'X';

  if (hasDislipidemia || hasHT) {
    record.clasificacion_riesgo_cardiovascular = 4;
  }
}

function encodeSangreOculta(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'POSITIVO') return 4;
  if (upper === 'NEGATIVO') return 5;
  return 21;
}
