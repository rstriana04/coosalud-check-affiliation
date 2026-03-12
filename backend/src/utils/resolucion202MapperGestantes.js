import {
  normalizeDate, safeParseFloat, safeParseInt,
  encodeLabResult, encodeSupplementSupply, encodeRiskLevel, setIfPresent,
} from './resolucion202Mapper.js';

export function mapGestantesData(data) {
  const record = { gestante: 1 };

  mapVitals(record, data);
  mapPregnancyDates(record, data);
  mapRiskClassification(record, data);
  mapSupplements(record, data);
  mapGlycemia(record, data);
  mapHemoglobin(record, data);
  mapHepatitisB(record, data);
  mapVih(record, data);
  mapSyphilis(record, data);

  return record;
}

function mapVitals(record, data) {
  const fecha = normalizeDate(data.fechaAtencion);
  setIfPresent(record, 'fecha_peso', fecha);
  setIfPresent(record, 'fecha_talla', fecha);
  setIfPresent(record, 'fecha_consulta_valoracion_integral', fecha);

  const peso = safeParseFloat(data.peso);
  setIfPresent(record, 'peso_kilogramos', peso);

  const talla = safeParseInt(data.talla);
  setIfPresent(record, 'talla_centimetros', talla);
}

function mapPregnancyDates(record, data) {
  setIfPresent(record, 'fecha_probable_parto', normalizeDate(data.fpp));

  const fechaAtencion = normalizeDate(data.fechaAtencion);
  setIfPresent(record, 'fecha_ultimo_control_prenatal', fechaAtencion);
}

function mapRiskClassification(record, data) {
  if (!data.clasificacionRiesgo) return;
  const encoded = encodeRiskLevel(data.clasificacionRiesgo);
  if (encoded !== null) {
    record.clasificacion_riesgo_gestacional = encoded;
  }
}

function mapSupplements(record, data) {
  const folico = encodeSupplementSupply(data.acidoFolico);
  if (folico !== null) record.suministro_acido_folico_prenatal = folico;

  const ferroso = encodeSupplementSupply(data.sulfatoFerroso);
  if (ferroso !== null) record.suministro_sulfato_ferroso_prenatal = ferroso;

  const calcio = encodeSupplementSupply(data.calcio);
  if (calcio !== null) record.suministro_carbonato_calcio_prenatal = calcio;
}

function mapGlycemia(record, data) {
  const resultado = safeParseInt(data.glicemiaResultado);
  if (resultado !== null) {
    record.resultado_glicemia_basal = resultado;
    setIfPresent(record, 'fecha_toma_glicemia_basal', normalizeDate(data.glicemiaFecha));
  }
}

function mapHemoglobin(record, data) {
  const hb = safeParseFloat(data.hemogramaInicialHB);
  if (hb !== null) {
    record.resultado_hemoglobina = hb;
    setIfPresent(record, 'fecha_toma_hemoglobina', normalizeDate(data.hemogramaInicialFecha));
  }
}

function mapHepatitisB(record, data) {
  if (!data.hepatitisBResultado) return;
  const encoded = encodeLabResult(data.hepatitisBResultado);
  if (encoded !== null) {
    record.resultado_antigeno_hepatitis_b = encoded;
    setIfPresent(record, 'fecha_antigeno_hepatitis_b', normalizeDate(data.hepatitisBFecha));
  }
}

function mapVih(record, data) {
  const resultado = resolveLatestTrimester(
    data.vihTrim1Resultado, data.vihTrim2Resultado, data.vihTrim3Resultado
  );
  const fecha = resolveLatestTrimester(
    data.vihTrim1Fecha, data.vihTrim2Fecha, data.vihTrim3Fecha
  );

  if (!resultado) return;
  record.resultado_prueba_vih = encodeLabResult(resultado);
  setIfPresent(record, 'fecha_prueba_vih', normalizeDate(fecha));
}

function mapSyphilis(record, data) {
  const resultado = resolveLatestTrimester(
    data.serologiaTrim1Resultado, data.serologiaTrim2Resultado, data.serologiaTrim3Resultado
  );
  const fecha = resolveLatestTrimester(
    data.serologiaTrim1Fecha, data.serologiaTrim2Fecha, data.serologiaTrim3Fecha
  );

  if (!resultado) return;
  record.resultado_tamizaje_sifilis = encodeLabResult(resultado);
  setIfPresent(record, 'fecha_tamizaje_sifilis', normalizeDate(fecha));
}

function resolveLatestTrimester(trim1, trim2, trim3) {
  if (trim3) return trim3;
  if (trim2) return trim2;
  return trim1 || null;
}
