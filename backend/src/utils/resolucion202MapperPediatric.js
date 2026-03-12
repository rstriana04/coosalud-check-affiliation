import {
  normalizeDate, safeParseFloat, safeParseInt, setIfPresent,
} from './resolucion202Mapper.js';

export function mapPediatricData(data, programa) {
  const record = {};

  mapVitals(record, data);
  mapSupplements(record, data, programa);

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

function mapSupplements(record, data, programa) {
  if (programa !== 'primera-infancia') return;

  if (data.fortificacionCasera) {
    record.suministro_fortificacion_casera = encodeSupplementFlag(data.fortificacionCasera);
  }

  if (data.vitaminaA) {
    record.suministro_vitamina_a = encodeSupplementFlag(data.vitaminaA);
  }

  if (data.hierro) {
    record.suministro_hierro_primera_infancia = encodeSupplementFlag(data.hierro);
  }
}

function encodeSupplementFlag(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'SI' || upper === 'X') return 1;
  if (upper === 'NO') return 2;
  return 0;
}
