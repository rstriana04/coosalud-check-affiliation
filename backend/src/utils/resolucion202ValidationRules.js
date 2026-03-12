import { getTypeRules } from './resolucion202TypeRules.js';
import { getSexRules } from './resolucion202SexRules.js';
import { getAgeRules } from './resolucion202AgeRules.js';
import { getPairRules } from './resolucion202PairRules.js';
import { getGestacionRules } from './resolucion202GestacionRules.js';

let cachedRules = null;

export function getAllValidationRules() {
  if (cachedRules) return cachedRules;

  cachedRules = [
    ...getTypeRules(),
    ...getSexRules(),
    ...getAgeRules(),
    ...getPairRules(),
    ...getGestacionRules()
  ];

  return cachedRules;
}

export function getRulesByField(fieldIndex) {
  return getAllValidationRules().filter(rule => {
    if (Array.isArray(rule.field)) return rule.field.includes(fieldIndex);
    return rule.field === fieldIndex;
  });
}

export function getRulesByCode(code) {
  return getAllValidationRules().find(rule => rule.code === code);
}

export function getRulesByType(type) {
  return getAllValidationRules().filter(rule => rule.type === type);
}

export function getRuleCount() {
  return getAllValidationRules().length;
}
