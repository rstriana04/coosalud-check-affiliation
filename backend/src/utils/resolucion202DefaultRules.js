const SENTINEL_DATE_NA = '1845-01-01';
const SENTINEL_DATE_NO_DATA = '1800-01-01';
const NOT_EVALUATED = 21;
const NO_DATA_LAB = 998;

export const FIXED_DEFAULTS = {
  sifilis_gestacional_congenita: 0,
  hipotiroidismo_congenito: 0,
  lepra: NOT_EVALUATED,
  obesidad_desnutricion: NOT_EVALUATED,
  enfermedad_mental: NOT_EVALUATED,
  cancer_cervix: 0,
  dpt_menores_5: 0,
  neumococo: 0,
  consulta_psicologia: SENTINEL_DATE_NA,
  preservativos_its_1: 0,
  preservativos_its_2: SENTINEL_DATE_NA,
  tratamiento_sifilis_gestacional: 0,
  tratamiento_sifilis_congenita: 0,
};

export const MALE_DEFAULTS = {
  gestante: 0,
  fecha_probable_parto: SENTINEL_DATE_NA,
  clasificacion_riesgo_gestacional: 0,
  fecha_atencion_parto: SENTINEL_DATE_NA,
  fecha_salida_parto: SENTINEL_DATE_NA,
  fecha_lactancia_materna: SENTINEL_DATE_NA,
  fecha_primera_consulta_prenatal: SENTINEL_DATE_NA,
  resultado_glicemia_gestacional: 0,
  fecha_ultimo_control_prenatal: SENTINEL_DATE_NA,
  suministro_acido_folico_prenatal: 0,
  suministro_sulfato_ferroso: 0,
  suministro_carbonato_calcio: 0,
  acido_folico_preconcepcional: 0,
  fecha_hepatitis_b: SENTINEL_DATE_NA,
  resultado_hepatitis_b: 0,
  tamizaje_cancer_cervix: 0,
  fecha_tamizaje_cervix: SENTINEL_DATE_NA,
  resultado_tamizaje_cervix: 0,
  calidad_muestra_citologia: 0,
  codigo_ips_citologia: 0,
  fecha_colposcopia: SENTINEL_DATE_NA,
  fecha_biopsia_cervix: SENTINEL_DATE_NA,
  resultado_biopsia_cervix: 0,
  tratamiento_ablativo: 0,
  fecha_mamografia: SENTINEL_DATE_NA,
  resultado_mamografia: 0,
  fecha_biopsia_mama: SENTINEL_DATE_NA,
  fecha_resultado_biopsia_mama: SENTINEL_DATE_NA,
  resultado_biopsia_mama: 0,
};

export const FEMALE_DEFAULTS = {
  resultado_tacto_rectal: 0,
  fecha_tacto_rectal: SENTINEL_DATE_NA,
  fecha_toma_psa: SENTINEL_DATE_NA,
  resultado_psa: 0,
};

export const GESTATIONAL_EXCLUSION = {
  gestante: 0,
  fecha_probable_parto: SENTINEL_DATE_NA,
  clasificacion_riesgo_gestacional: 0,
  fecha_atencion_parto: SENTINEL_DATE_NA,
  fecha_salida_parto: SENTINEL_DATE_NA,
  fecha_lactancia_materna: SENTINEL_DATE_NA,
  fecha_primera_consulta_prenatal: SENTINEL_DATE_NA,
  resultado_glicemia_gestacional: 0,
  fecha_ultimo_control_prenatal: SENTINEL_DATE_NA,
  suministro_acido_folico_prenatal: 0,
  suministro_sulfato_ferroso: 0,
  suministro_carbonato_calcio: 0,
  acido_folico_preconcepcional: 0,
  fecha_hepatitis_b: SENTINEL_DATE_NA,
  resultado_hepatitis_b: 0,
};

export function buildAgeRules(age) {
  const rules = {};

  if (age < 3) {
    Object.assign(rules, {
      agudeza_visual_od: 0,
      agudeza_visual_oi: 0,
      fecha_agudeza_visual: SENTINEL_DATE_NA,
    });
  }

  if (age > 5) {
    Object.assign(rules, {
      resultado_tsh_neonatal: 0,
      resultado_tamizaje_neonatal: 0,
      escala_desarrollo_1: 0,
      escala_desarrollo_2: 0,
      escala_desarrollo_3: 0,
      escala_desarrollo_4: 0,
      oximetria: 0,
      vale: 0,
      fecha_tamizaje_auditivo: SENTINEL_DATE_NA,
      fecha_tamizaje_visual_neonatal: SENTINEL_DATE_NA,
      fecha_oximetria: SENTINEL_DATE_NA,
      fortificacion_casera: 0,
      vitamina_a: 0,
      hierro_primera_infancia: 0,
    });
  }

  if (age > 12) {
    rules.fecha_vale = SENTINEL_DATE_NA;
  }

  if (age < 10) {
    Object.assign(rules, {
      fecha_asesoria_anticoncepcion: SENTINEL_DATE_NA,
      suministro_metodo_anticonceptivo: 0,
      fecha_suministro_anticonceptivo: SENTINEL_DATE_NA,
    });
  }

  if (age < 18) {
    Object.assign(rules, {
      codigo_ocupacion: '9998',
      consumo_tabaco: 98,
      clasificacion_riesgo_cardiovascular: 0,
      clasificacion_riesgo_metabolico: 0,
    });
  }

  if (age >= 18) {
    Object.assign(rules, {
      codigo_ocupacion: '9999',
      clasificacion_riesgo_cardiovascular: NOT_EVALUATED,
      clasificacion_riesgo_metabolico: NOT_EVALUATED,
    });
  }

  if (age < 29) {
    Object.assign(rules, {
      resultado_glicemia: 0,
      resultado_ldl: 0,
      resultado_hdl: 0,
      resultado_trigliceridos: 0,
      fecha_toma_ldl: SENTINEL_DATE_NA,
      fecha_glicemia: SENTINEL_DATE_NA,
      fecha_toma_hdl: SENTINEL_DATE_NA,
      fecha_trigliceridos: SENTINEL_DATE_NA,
    });
  }

  if (age < 50 || age > 75) {
    Object.assign(rules, {
      resultado_sangre_oculta: 0,
      resultado_colonoscopia: 0,
      fecha_colonoscopia: SENTINEL_DATE_NA,
      fecha_sangre_oculta: SENTINEL_DATE_NA,
    });
  }

  if (age < 50) {
    Object.assign(rules, {
      resultado_hepatitis_c: 0,
      fecha_hepatitis_c: SENTINEL_DATE_NA,
    });
  }

  if (age < 60) {
    rules.resultado_mini_mental = 0;
  }

  if (age >= 60) {
    rules.resultado_mini_mental = NOT_EVALUATED;
  }

  return rules;
}

export function buildMaleAgeRules(age) {
  const rules = {};

  if (age < 45) {
    Object.assign(rules, {
      resultado_tacto_rectal: 0,
      fecha_tacto_rectal: SENTINEL_DATE_NA,
      fecha_toma_psa: SENTINEL_DATE_NA,
      resultado_psa: 0,
    });
  }

  return rules;
}

export function buildFemaleAgeRules(age) {
  const rules = {};

  if (age < 10 || age > 59) {
    Object.assign(rules, GESTATIONAL_EXCLUSION);
  }

  if (age < 50) {
    Object.assign(rules, {
      fecha_mamografia: SENTINEL_DATE_NA,
      resultado_mamografia: 0,
      fecha_biopsia_mama: SENTINEL_DATE_NA,
      fecha_resultado_biopsia_mama: SENTINEL_DATE_NA,
      resultado_biopsia_mama: 0,
    });
  }

  return rules;
}

export { SENTINEL_DATE_NA, SENTINEL_DATE_NO_DATA, NOT_EVALUATED, NO_DATA_LAB };
