import {
  FIXED_DEFAULTS,
  MALE_DEFAULTS,
  FEMALE_DEFAULTS,
  buildAgeRules,
  buildMaleAgeRules,
  buildFemaleAgeRules,
  SENTINEL_DATE_NO_DATA,
  NOT_EVALUATED,
  NO_DATA_LAB,
} from './resolucion202DefaultRules.js';
import {
  ALL_FIELDS,
  DATE_FIELDS,
  SCREENING_RESULT_FIELDS,
  LAB_RESULT_FIELDS,
} from './resolucion202Fields.js';

export function calculateAge(fechaNacimiento, referenceDate) {
  const birth = new Date(fechaNacimiento);
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function buildFallbackDefaults() {
  const defaults = {};
  for (const field of ALL_FIELDS) {
    if (DATE_FIELDS.has(field)) {
      defaults[field] = SENTINEL_DATE_NO_DATA;
    } else if (LAB_RESULT_FIELDS.has(field)) {
      defaults[field] = NO_DATA_LAB;
    } else if (SCREENING_RESULT_FIELDS.has(field)) {
      defaults[field] = NOT_EVALUATED;
    }
  }
  return defaults;
}

export function getDefaults(sexo, age) {
  const defaults = buildFallbackDefaults();

  Object.assign(defaults, FIXED_DEFAULTS);

  if (sexo === 'M') {
    Object.assign(defaults, MALE_DEFAULTS);
  }

  if (sexo === 'F') {
    Object.assign(defaults, FEMALE_DEFAULTS);
  }

  Object.assign(defaults, buildAgeRules(age));

  if (sexo === 'M') {
    Object.assign(defaults, buildMaleAgeRules(age));
  }

  if (sexo === 'F') {
    Object.assign(defaults, buildFemaleAgeRules(age));
  }

  return defaults;
}

export function applyDefaults(record, referenceDate) {
  const sexo = record.sexo;
  const fechaNacimiento = record.fecha_nacimiento;

  if (!sexo || !fechaNacimiento) {
    throw new Error('Record must have sexo and fecha_nacimiento fields');
  }

  const age = calculateAge(fechaNacimiento, referenceDate);
  const defaults = getDefaults(sexo, age);

  const filled = { ...record };

  for (const [field, defaultValue] of Object.entries(defaults)) {
    if (filled[field] === undefined || filled[field] === null || filled[field] === '') {
      filled[field] = defaultValue;
    }
  }

  return filled;
}
