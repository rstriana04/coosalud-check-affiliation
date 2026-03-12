import {
  normalizeDate, safeParseFloat, safeParseInt, setIfPresent,
} from './resolucion202Mapper.js';

export function mapCitologiasData(data) {
  const record = {};

  mapVitals(record, data);
  mapCitologiaScreening(record, data);

  return record;
}

function mapVitals(record, data) {
  const fecha = normalizeDate(data.fecha);
  setIfPresent(record, 'fecha_consulta_valoracion_integral', fecha);

  const peso = safeParseFloat(data.peso);
  if (peso !== null) {
    setIfPresent(record, 'fecha_peso', fecha);
    record.peso_kilogramos = peso;
  }

  const talla = safeParseInt(data.talla);
  if (talla !== null) {
    setIfPresent(record, 'fecha_talla', fecha);
    record.talla_centimetros = talla;
  }
}

function mapCitologiaScreening(record, data) {
  const fechaToma = normalizeDate(data.fechaTomaCitologia || data.fecha);
  setIfPresent(record, 'fecha_tamizaje_cancer_cuello_uterino', fechaToma);
  record.tamizaje_cancer_cuello_uterino = 1;
}
