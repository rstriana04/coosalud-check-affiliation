const FIELD_DEFINITIONS = [
  { no: 0, col: 'tipo_registro', type: 'INTEGER', default: 2 },
  { no: 2, col: 'codigo_habilitacion_ips', type: 'TEXT', default: '761471222301' },
  { no: 3, col: 'tipo_identificacion', type: 'TEXT', default: null },
  { no: 4, col: 'numero_identificacion', type: 'TEXT', default: null },
  { no: 5, col: 'primer_apellido', type: 'TEXT', default: null },
  { no: 6, col: 'segundo_apellido', type: 'TEXT', default: 'NONE' },
  { no: 7, col: 'primer_nombre', type: 'TEXT', default: null },
  { no: 8, col: 'segundo_nombre', type: 'TEXT', default: 'NONE' },
  { no: 9, col: 'fecha_nacimiento', type: 'TEXT', default: null },
  { no: 10, col: 'sexo', type: 'TEXT', default: null },
  { no: 11, col: 'codigo_pertenencia_etnica', type: 'INTEGER', default: 6 },
  { no: 12, col: 'codigo_ocupacion', type: 'TEXT', default: '9999' },
  { no: 13, col: 'codigo_nivel_educativo', type: 'INTEGER', default: 13 },
  { no: 14, col: 'gestante', type: 'INTEGER', default: 0 },
  { no: 15, col: 'sifilis_gestacional_congenita', type: 'INTEGER', default: 0 },
  { no: 16, col: 'resultado_prueba_mini_mental', type: 'INTEGER', default: 0 },
  { no: 17, col: 'hipotiroidismo_congenito', type: 'INTEGER', default: 0 },
  { no: 18, col: 'sintomatico_respiratorio', type: 'INTEGER', default: 21 },
  { no: 19, col: 'consumo_tabaco', type: 'INTEGER', default: 99 },
  { no: 20, col: 'lepra', type: 'INTEGER', default: 21 },
  { no: 21, col: 'obesidad_desnutricion', type: 'INTEGER', default: 21 },
  { no: 22, col: 'resultado_tacto_rectal', type: 'INTEGER', default: 0 },
  { no: 23, col: 'acido_folico_preconcepcional', type: 'INTEGER', default: 0 },
  { no: 24, col: 'resultado_sangre_oculta_fecal', type: 'INTEGER', default: 0 },
  { no: 25, col: 'enfermedad_mental', type: 'INTEGER', default: 21 },
  { no: 26, col: 'cancer_cervix', type: 'INTEGER', default: 0 },
  { no: 27, col: 'agudeza_visual_ojo_izquierdo', type: 'INTEGER', default: 0 },
  { no: 28, col: 'agudeza_visual_ojo_derecho', type: 'INTEGER', default: 0 },
  { no: 29, col: 'fecha_peso', type: 'TEXT', default: '1800-01-01' },
  { no: 30, col: 'peso_kilogramos', type: 'REAL', default: 999 },
  { no: 31, col: 'fecha_talla', type: 'TEXT', default: '1800-01-01' },
  { no: 32, col: 'talla_centimetros', type: 'INTEGER', default: 999 },
  { no: 33, col: 'fecha_probable_parto', type: 'TEXT', default: '1845-01-01' },
  { no: 34, col: 'codigo_pais', type: 'INTEGER', default: 170 },
  { no: 35, col: 'clasificacion_riesgo_gestacional', type: 'INTEGER', default: 0 },
  { no: 36, col: 'resultado_colonoscopia_tamizaje', type: 'INTEGER', default: 0 },
  { no: 37, col: 'resultado_tamizaje_auditivo_neonatal', type: 'INTEGER', default: 0 },
  { no: 38, col: 'resultado_tamizaje_visual_neonatal', type: 'INTEGER', default: 0 },
  { no: 39, col: 'dpt_menores_5_anios', type: 'INTEGER', default: 0 },
  { no: 40, col: 'resultado_tamizaje_vale', type: 'INTEGER', default: 0 },
  { no: 41, col: 'neumococo', type: 'INTEGER', default: 0 },
  { no: 42, col: 'resultado_tamizaje_hepatitis_c', type: 'INTEGER', default: 0 },
  { no: 43, col: 'resultado_escala_motricidad_gruesa', type: 'INTEGER', default: 0 },
  { no: 44, col: 'resultado_escala_motricidad_finoadaptativa', type: 'INTEGER', default: 0 },
  { no: 45, col: 'resultado_escala_personal_social', type: 'INTEGER', default: 0 },
  { no: 46, col: 'resultado_escala_audicion_lenguaje', type: 'INTEGER', default: 0 },
  { no: 47, col: 'tratamiento_ablativo_escision', type: 'INTEGER', default: 0 },
  { no: 48, col: 'resultado_tamizaje_oximetria', type: 'INTEGER', default: 0 },
  { no: 49, col: 'fecha_atencion_parto_cesarea', type: 'TEXT', default: '1845-01-01' },
  { no: 50, col: 'fecha_salida_atencion_parto', type: 'TEXT', default: '1845-01-01' },
  { no: 51, col: 'fecha_atencion_lactancia_materna', type: 'TEXT', default: '1845-01-01' },
  { no: 52, col: 'fecha_consulta_valoracion_integral', type: 'TEXT', default: '1845-01-01' },
  { no: 53, col: 'fecha_asesoria_anticoncepcion', type: 'TEXT', default: '1845-01-01' },
  { no: 54, col: 'suministro_metodo_anticonceptivo', type: 'INTEGER', default: 0 },
  { no: 55, col: 'fecha_suministro_anticonceptivo', type: 'TEXT', default: '1845-01-01' },
  { no: 56, col: 'fecha_primera_consulta_prenatal', type: 'TEXT', default: '1845-01-01' },
  { no: 57, col: 'resultado_glicemia_basal', type: 'INTEGER', default: 0 },
  { no: 58, col: 'fecha_ultimo_control_prenatal', type: 'TEXT', default: '1845-01-01' },
  { no: 59, col: 'suministro_acido_folico_prenatal', type: 'INTEGER', default: 0 },
  { no: 60, col: 'suministro_sulfato_ferroso_prenatal', type: 'INTEGER', default: 0 },
  { no: 61, col: 'suministro_carbonato_calcio_prenatal', type: 'INTEGER', default: 0 },
  { no: 62, col: 'fecha_valoracion_agudeza_visual', type: 'TEXT', default: '1845-01-01' },
  { no: 63, col: 'fecha_tamizaje_vale', type: 'TEXT', default: '1845-01-01' },
  { no: 64, col: 'fecha_tacto_rectal', type: 'TEXT', default: '1845-01-01' },
  { no: 65, col: 'fecha_tamizaje_oximetria', type: 'TEXT', default: '1845-01-01' },
  { no: 66, col: 'fecha_colonoscopia_tamizaje', type: 'TEXT', default: '1845-01-01' },
  { no: 67, col: 'fecha_sangre_oculta_fecal', type: 'TEXT', default: '1845-01-01' },
  { no: 68, col: 'consulta_psicologia', type: 'TEXT', default: '1845-01-01' },
  { no: 69, col: 'fecha_tamizaje_auditivo_neonatal', type: 'TEXT', default: '1845-01-01' },
  { no: 70, col: 'suministro_fortificacion_casera', type: 'INTEGER', default: 0 },
  { no: 71, col: 'suministro_vitamina_a', type: 'INTEGER', default: 0 },
  { no: 72, col: 'fecha_toma_ldl', type: 'TEXT', default: '1845-01-01' },
  { no: 73, col: 'fecha_toma_psa', type: 'TEXT', default: '1845-01-01' },
  { no: 74, col: 'preservativos_entregados_its', type: 'INTEGER', default: 0 },
  { no: 75, col: 'fecha_tamizaje_visual_neonatal', type: 'TEXT', default: '1845-01-01' },
  { no: 76, col: 'fecha_atencion_salud_bucal', type: 'TEXT', default: '1845-01-01' },
  { no: 77, col: 'suministro_hierro_primera_infancia', type: 'INTEGER', default: 0 },
  { no: 78, col: 'fecha_antigeno_hepatitis_b', type: 'TEXT', default: '1845-01-01' },
  { no: 79, col: 'resultado_antigeno_hepatitis_b', type: 'INTEGER', default: 0 },
  { no: 80, col: 'fecha_tamizaje_sifilis', type: 'TEXT', default: '1845-01-01' },
  { no: 81, col: 'resultado_tamizaje_sifilis', type: 'INTEGER', default: 0 },
  { no: 82, col: 'fecha_prueba_vih', type: 'TEXT', default: '1845-01-01' },
  { no: 83, col: 'resultado_prueba_vih', type: 'INTEGER', default: 0 },
  { no: 84, col: 'fecha_tsh_neonatal', type: 'TEXT', default: '1845-01-01' },
  { no: 85, col: 'resultado_tsh_neonatal', type: 'INTEGER', default: 0 },
  { no: 86, col: 'tamizaje_cancer_cuello_uterino', type: 'INTEGER', default: 0 },
  { no: 87, col: 'fecha_tamizaje_cancer_cuello_uterino', type: 'TEXT', default: '1845-01-01' },
  { no: 88, col: 'resultado_tamizaje_cancer_cuello_uterino', type: 'INTEGER', default: 0 },
  { no: 89, col: 'calidad_muestra_citologia', type: 'INTEGER', default: 0 },
  { no: 90, col: 'codigo_habilitacion_tamizaje_cuello', type: 'INTEGER', default: 0 },
  { no: 91, col: 'fecha_colposcopia', type: 'TEXT', default: '1845-01-01' },
  { no: 92, col: 'resultado_ldl', type: 'INTEGER', default: 0 },
  { no: 93, col: 'fecha_biopsia_cervicouterina', type: 'TEXT', default: '1845-01-01' },
  { no: 94, col: 'resultado_biopsia_cervicouterina', type: 'INTEGER', default: 0 },
  { no: 95, col: 'resultado_hdl', type: 'INTEGER', default: 0 },
  { no: 96, col: 'fecha_toma_mamografia', type: 'TEXT', default: '1845-01-01' },
  { no: 97, col: 'resultado_mamografia', type: 'INTEGER', default: 0 },
  { no: 98, col: 'resultado_trigliceridos', type: 'INTEGER', default: 0 },
  { no: 99, col: 'fecha_biopsia_mama', type: 'TEXT', default: '1845-01-01' },
  { no: 100, col: 'fecha_resultado_biopsia_mama', type: 'TEXT', default: '1845-01-01' },
  { no: 101, col: 'resultado_biopsia_mama', type: 'INTEGER', default: 0 },
  { no: 102, col: 'cop_por_persona', type: 'INTEGER', default: 0 },
  { no: 103, col: 'fecha_toma_hemoglobina', type: 'TEXT', default: '1845-01-01' },
  { no: 104, col: 'resultado_hemoglobina', type: 'REAL', default: 0 },
  { no: 105, col: 'fecha_toma_glicemia_basal', type: 'TEXT', default: '1845-01-01' },
  { no: 106, col: 'fecha_toma_creatinina', type: 'TEXT', default: '1845-01-01' },
  { no: 107, col: 'resultado_creatinina', type: 'REAL', default: 0 },
  { no: 108, col: 'preservativos_entregados_its_fecha', type: 'TEXT', default: '1845-01-01' },
  { no: 109, col: 'resultado_psa', type: 'REAL', default: 0 },
  { no: 110, col: 'fecha_tamizaje_hepatitis_c', type: 'TEXT', default: '1845-01-01' },
  { no: 111, col: 'fecha_toma_hdl', type: 'TEXT', default: '1845-01-01' },
  { no: 112, col: 'fecha_toma_baciloscopia', type: 'TEXT', default: '1845-01-01' },
  { no: 113, col: 'resultado_baciloscopia', type: 'INTEGER', default: 21 },
  { no: 114, col: 'clasificacion_riesgo_cardiovascular', type: 'INTEGER', default: 0 },
  { no: 115, col: 'tratamiento_sifilis_gestacional', type: 'INTEGER', default: 0 },
  { no: 116, col: 'tratamiento_sifilis_congenita', type: 'INTEGER', default: 0 },
  { no: 117, col: 'clasificacion_riesgo_metabolico', type: 'INTEGER', default: 0 },
  { no: 118, col: 'fecha_toma_trigliceridos', type: 'TEXT', default: '1845-01-01' },
];

const NON_DEFAULT_SENTINEL_COLUMNS = [
  'tipo_identificacion', 'numero_identificacion', 'primer_apellido',
  'primer_nombre', 'fecha_nacimiento', 'sexo'
];

export function getFieldDefinitions() {
  return FIELD_DEFINITIONS;
}

export function getColumnNames() {
  return FIELD_DEFINITIONS.map(f => f.col);
}

export function buildCreateTableSQL() {
  const fieldLines = FIELD_DEFINITIONS.map(f => {
    const defaultClause = f.default === null ? '' : ` DEFAULT ${formatDefault(f)}`;
    return `  ${f.col} ${f.type}${defaultClause}`;
  });

  return `CREATE TABLE IF NOT EXISTS patient_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporting_period TEXT NOT NULL,
  source_program TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
${fieldLines.join(',\n')},
  UNIQUE(numero_identificacion, reporting_period, source_program)
)`;
}

export function buildUpsertSQL() {
  const cols = FIELD_DEFINITIONS.map(f => f.col);
  const allCols = ['reporting_period', 'source_program', ...cols];
  const placeholders = allCols.map(c => `@${c}`);
  const updateClauses = cols.map(c => `${c} = @${c}`);

  return `INSERT INTO patient_records (${allCols.join(', ')})
VALUES (${placeholders.join(', ')})
ON CONFLICT(numero_identificacion, reporting_period, source_program)
DO UPDATE SET ${updateClauses.join(', ')}, updated_at = datetime('now')`;
}

export function isNonDefaultValue(columnName, value) {
  if (value === null || value === undefined) return false;
  const field = FIELD_DEFINITIONS.find(f => f.col === columnName);
  if (!field) return false;
  if (NON_DEFAULT_SENTINEL_COLUMNS.includes(columnName)) return value !== null;
  return value !== field.default;
}

export function getDefaultForColumn(columnName) {
  const field = FIELD_DEFINITIONS.find(f => f.col === columnName);
  return field ? field.default : null;
}

function formatDefault(field) {
  if (field.type === 'TEXT') return `'${field.default}'`;
  return field.default;
}
