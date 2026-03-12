import { buildAgeContext, mustBeSentinel } from './resolucion202ValidationHelpers.js';

function buildCervixAgeRules() {
  const numericFields = [86, 88, 89, 47];
  const dateFields = [87, 91, 93, 94];

  const rules = [];
  numericFields.forEach(f => {
    rules.push({
      code: `E7X${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} cervix: debe ser 0 si mujer < 10 anios`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.sex !== 'F' || age.years >= 10) return true;
        return mustBeSentinel(record, f, 0);
      }
    });
  });

  dateFields.forEach(f => {
    rules.push({
      code: `E7X${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} fecha cervix: debe ser 1845-01-01 si mujer < 10 anios`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.sex !== 'F' || age.years >= 10) return true;
        return mustBeSentinel(record, f, '1845-01-01');
      }
    });
  });

  return rules;
}

function buildCvRiskRules() {
  return [114, 117].map(f => ({
    code: `E7R${String(f).padStart(3, '0')}`,
    type: 'error',
    field: f,
    description: `Campo ${f} riesgo CV: debe ser 0 si edad < 18 anios`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years >= 18) return true;
      return mustBeSentinel(record, f, 0);
    }
  }));
}

function buildLipidPanelRules() {
  return [72, 105, 111, 118].map(f => ({
    code: `E7L${String(f).padStart(3, '0')}`,
    type: 'error',
    field: f,
    description: `Campo ${f} fecha lipidos: debe ser 1845-01-01 si edad < 29 anios`,
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years >= 29) return true;
      return mustBeSentinel(record, f, '1845-01-01');
    }
  }));
}

function buildProstateRules() {
  const dateFields = [64, 73];
  const numericFields = [22, 109];

  const rules = [];
  dateFields.forEach(f => {
    rules.push({
      code: `E7Q${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} prostata: debe ser 1845-01-01 si hombre < 45 anios`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.sex !== 'M' || age.years >= 45) return true;
        return mustBeSentinel(record, f, '1845-01-01');
      }
    });
  });

  numericFields.forEach(f => {
    rules.push({
      code: `E7Q${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} prostata: debe ser 0 si hombre < 45 anios`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.sex !== 'M' || age.years >= 45) return true;
        return mustBeSentinel(record, f, 0);
      }
    });
  });

  return rules;
}

function buildColonCancerRules() {
  const dateFields = [66, 67];
  const numericFields = [24, 36];

  const rules = [];
  dateFields.forEach(f => {
    rules.push({
      code: `E7K${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} cancer colon: debe ser 1845-01-01 si edad < 50 o > 75`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.years >= 50 && age.years <= 75) return true;
        return mustBeSentinel(record, f, '1845-01-01');
      }
    });
  });

  numericFields.forEach(f => {
    rules.push({
      code: `E7K${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} cancer colon: debe ser 0 si edad < 50 o > 75`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.years >= 50 && age.years <= 75) return true;
        return mustBeSentinel(record, f, 0);
      }
    });
  });

  return rules;
}

function buildMammographyRules() {
  const dateFields = [96, 99, 100];
  const numericFields = [97, 101];

  const rules = [];
  dateFields.forEach(f => {
    rules.push({
      code: `E7W${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} mamografia: debe ser 1845-01-01 si mujer < 50 anios`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.sex !== 'F' || age.years >= 50) return true;
        return mustBeSentinel(record, f, '1845-01-01');
      }
    });
  });

  numericFields.forEach(f => {
    rules.push({
      code: `E7W${String(f).padStart(3, '0')}`,
      type: 'error',
      field: f,
      description: `Campo ${f} mamografia: debe ser 0 si mujer < 50 anios`,
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.sex !== 'F' || age.years >= 50) return true;
        return mustBeSentinel(record, f, 0);
      }
    });
  });

  return rules;
}

function buildHepatitisCRules() {
  return [
    {
      code: 'E7H110',
      type: 'error',
      field: 110,
      description: 'Fecha hepatitis C: debe ser 1845-01-01 si edad < 50 anios',
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.years >= 50) return true;
        return mustBeSentinel(record, 110, '1845-01-01');
      }
    },
    {
      code: 'E7H042',
      type: 'error',
      field: 42,
      description: 'Resultado hepatitis C: debe ser 0 si edad < 50 anios',
      validate: (record, context) => {
        const age = buildAgeContext(record, context);
        if (age.years >= 50) return true;
        return mustBeSentinel(record, 42, 0);
      }
    }
  ];
}

function buildMiniMentalRules() {
  return [{
    code: 'E7MM16',
    type: 'error',
    field: 16,
    description: 'Mini-mental: debe ser 0 si edad < 60 anios',
    validate: (record, context) => {
      const age = buildAgeContext(record, context);
      if (age.years >= 60) return true;
      return mustBeSentinel(record, 16, 0);
    }
  }];
}

export function getAdultAgeRules() {
  return [
    ...buildCervixAgeRules(),
    ...buildCvRiskRules(),
    ...buildLipidPanelRules(),
    ...buildProstateRules(),
    ...buildColonCancerRules(),
    ...buildMammographyRules(),
    ...buildHepatitisCRules(),
    ...buildMiniMentalRules()
  ];
}
