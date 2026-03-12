import {
  normalizeDate, safeParseFloat, safeParseInt,
  encodeLabResult, setIfPresent,
} from './resolucion202Mapper.js';

export function mapLifecycleData(data, programa) {
  const record = {};

  mapVitals(record, data);
  mapLipidPanel(record, data);
  mapGlucoseAndCreatinine(record, data);
  mapHemoglobin(record, data);
  mapPsaAndSangreOculta(record, data);
  mapTobacco(record, data);
  mapScreenings(record, data, programa);
  mapInfectiousTests(record, data);

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

function mapTobacco(record, data) {
  if (!data.consumoTabaco) return;
  const parsed = safeParseInt(data.consumoTabaco);
  if (parsed !== null) {
    record.consumo_tabaco = parsed;
  }
}

function mapScreenings(record, data, programa) {
  const isFemale = data.sexo === 'F';
  const edad = parseAge(data.edadConsulta);

  if (isFemale && data.fechaCitologia) {
    setIfPresent(record, 'fecha_tamizaje_cancer_cuello_uterino', normalizeDate(data.fechaCitologia));
  }

  if (isFemale && edad >= 50 && data.fechaMamografia) {
    setIfPresent(record, 'fecha_toma_mamografia', normalizeDate(data.fechaMamografia));
  }

  const isMale = data.sexo === 'M';
  if (isMale && edad >= 45 && data.tactoRectal) {
    mapTactoRectal(record, data);
  }
}

function mapTactoRectal(record, data) {
  if (!data.tactoRectal) return;
  const tacto = String(data.tactoRectal).toUpperCase().trim();
  if (tacto === 'NORMAL' || tacto === 'NEGATIVO') {
    record.resultado_tacto_rectal = 5;
  } else if (tacto === 'ANORMAL' || tacto === 'POSITIVO') {
    record.resultado_tacto_rectal = 4;
  } else {
    record.resultado_tacto_rectal = 21;
  }
  setIfPresent(record, 'fecha_tacto_rectal', normalizeDate(data.fecha));
}

function mapInfectiousTests(record, data) {
  if (data.sifilis && data.sifilis !== '-') {
    setIfPresent(record, 'fecha_tamizaje_sifilis', normalizeDate(data.fechaLabSifilis));
    record.resultado_tamizaje_sifilis = encodeLabResult(data.sifilis);
  }

  if (data.vih && data.vih !== '-') {
    setIfPresent(record, 'fecha_prueba_vih', normalizeDate(data.fechaLabVih));
    record.resultado_prueba_vih = encodeLabResult(data.vih);
  }
}

function encodeSangreOculta(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'POSITIVO') return 4;
  if (upper === 'NEGATIVO') return 5;
  return 21;
}

function parseAge(edadConsulta) {
  if (!edadConsulta) return 0;
  if (typeof edadConsulta === 'number') return edadConsulta;
  const match = String(edadConsulta).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}
