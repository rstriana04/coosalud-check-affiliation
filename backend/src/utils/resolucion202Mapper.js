import { mapRcvData } from './resolucion202MapperRcv.js';
import { mapLifecycleData } from './resolucion202MapperLifecycle.js';
import { mapPediatricData } from './resolucion202MapperPediatric.js';
import { mapGestantesData } from './resolucion202MapperGestantes.js';
import { mapCitologiasData } from './resolucion202MapperCitologias.js';
import { mapPlanificacionData } from './resolucion202MapperPlanificacion.js';

const PROGRAM_MAPPERS = {
  'riesgo-cardiovascular': mapRcvData,
  'primera-infancia': mapPediatricData,
  'infancia': mapPediatricData,
  'adolescencia': mapPediatricData,
  'juventud': mapLifecycleData,
  'adultez': mapLifecycleData,
  'vejez': mapLifecycleData,
  'planificacion-familiar': mapPlanificacionData,
  'citologias': mapCitologiasData,
  'seguimiento-gestantes': mapGestantesData,
};

export function mapToResolucion202(extractedData, programa, reportingPeriod) {
  const mapper = PROGRAM_MAPPERS[programa];
  if (!mapper) {
    throw new Error(`No mapper found for programa: ${programa}`);
  }

  const base = buildBaseRecord(extractedData, programa, reportingPeriod);
  const specific = mapper(extractedData, programa);
  return { ...base, ...specific };
}

function buildBaseRecord(data, programa, reportingPeriod) {
  const period = reportingPeriod || deriveReportingPeriod(data.fecha || data.fechaAtencion);
  const record = {
    reporting_period: period,
    source_program: programa,
  };

  const demographics = mapCommonDemographics(data);
  return { ...record, ...demographics };
}

function mapCommonDemographics(data) {
  const record = {};

  setIfPresent(record, 'primer_apellido', toUpper(data.primerApellido));
  setIfPresent(record, 'segundo_apellido', toUpper(data.segundoApellido) || 'NONE');
  setIfPresent(record, 'primer_nombre', toUpper(data.primerNombre));
  setIfPresent(record, 'segundo_nombre', toUpper(data.segundoNombre) || 'NONE');

  const tipoId = data.tipoIdentificacion || data.docType || data.tipoId;
  setIfPresent(record, 'tipo_identificacion', tipoId);

  const numId = data.numeroIdentificacion || data.identificacion;
  setIfPresent(record, 'numero_identificacion', numId);

  setIfPresent(record, 'fecha_nacimiento', normalizeDate(data.fechaNacimiento));
  setIfPresent(record, 'sexo', data.sexo);

  return record;
}

export function deriveReportingPeriod(fechaAtencion) {
  if (!fechaAtencion) return null;
  const parts = fechaAtencion.split('-');
  if (parts.length < 2) return null;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

export function encodeLabResult(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'REACTIVO' || upper === 'POSITIVO') return 4;
  if (upper === 'NO REACTIVO' || upper === 'NEGATIVO') return 5;
  return 21;
}

export function encodeSupplementSupply(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'SI') return 1;
  if (upper === 'NO') return 2;
  return 0;
}

export function encodeRiskLevel(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'ALTO') return 4;
  if (upper === 'BAJO') return 5;
  if (upper === 'MODERADO') return 6;
  return 21;
}

export function safeParseFloat(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

export function safeParseInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

export function normalizeDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return null;

  const [, day, month, yearRaw] = match;
  const year = yearRaw.length === 2
    ? (parseInt(yearRaw, 10) <= 50 ? `20${yearRaw}` : `19${yearRaw}`)
    : yearRaw;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function setIfPresent(record, key, value) {
  if (value !== null && value !== undefined && value !== '') {
    record[key] = value;
  }
}

function toUpper(str) {
  if (!str) return null;
  return String(str).toUpperCase();
}
