import {
  normalizeDate, safeParseFloat, safeParseInt, setIfPresent,
} from './resolucion202Mapper.js';

const METHOD_CODES = {
  'pomeroy': 1,
  'vasectomia': 2,
  'diu': 3,
  'anovulatoriosOrales': 4,
  'inyectableMensual': 5,
  'inyectableTrimestral': 6,
  'metodoBarrera': 7,
  'implanteSubdermico': 8,
};

export function mapPlanificacionData(data) {
  const record = {};

  mapVitals(record, data);
  mapAnticoncepcion(record, data);

  return record;
}

function mapVitals(record, data) {
  const fecha = normalizeDate(data.fecha);
  setIfPresent(record, 'fecha_peso', fecha);
  setIfPresent(record, 'fecha_talla', fecha);
  setIfPresent(record, 'fecha_consulta_valoracion_integral', fecha);
  setIfPresent(record, 'fecha_asesoria_anticoncepcion', fecha);

  const peso = safeParseFloat(data.pesoKg);
  setIfPresent(record, 'peso_kilogramos', peso);

  const talla = safeParseInt(data.tallaCm);
  setIfPresent(record, 'talla_centimetros', talla);
}

function mapAnticoncepcion(record, data) {
  const methodCode = resolveMethodCode(data);
  if (methodCode !== null) {
    record.suministro_metodo_anticonceptivo = methodCode;
    setIfPresent(record, 'fecha_suministro_anticonceptivo', normalizeDate(data.fecha));
  }
}

function resolveMethodCode(data) {
  for (const [field, code] of Object.entries(METHOD_CODES)) {
    if (data[field] && data[field] === 'X') return code;
  }
  return null;
}
