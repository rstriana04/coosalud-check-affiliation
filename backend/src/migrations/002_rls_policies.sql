ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_patient_records"
ON patient_records
FOR SELECT
TO anon
USING (true);

CREATE POLICY "insert_patient_records"
ON patient_records
FOR INSERT
TO anon
WITH CHECK (
  numero_identificacion IS NOT NULL
  AND length(numero_identificacion) >= 3
  AND reporting_period IS NOT NULL
  AND length(reporting_period) >= 3
  AND source_program IS NOT NULL
  AND source_program IN (
    'rcv',
    'primera-infancia',
    'infancia',
    'adolescencia',
    'juventud',
    'adultez',
    'vejez',
    'planificacion-familiar',
    'citologias',
    'seguimiento-gestantes',
    'consolidado'
  )
  AND (sexo IS NULL OR sexo IN ('M', 'F'))
  AND (tipo_identificacion IS NULL OR tipo_identificacion IN (
    'CC', 'TI', 'RC', 'CE', 'PA', 'CD', 'PE', 'SC', 'DE', 'MS', 'AS', 'CN'
  ))
  AND (fecha_nacimiento IS NULL OR fecha_nacimiento ~ '^\d{4}-\d{2}-\d{2}$')
  AND (codigo_pertenencia_etnica IS NULL OR codigo_pertenencia_etnica BETWEEN 1 AND 6)
  AND (gestante IS NULL OR gestante IN (0, 1, 2, 21))
);

CREATE POLICY "update_patient_records"
ON patient_records
FOR UPDATE
TO anon
USING (true)
WITH CHECK (
  numero_identificacion IS NOT NULL
  AND length(numero_identificacion) >= 3
  AND reporting_period IS NOT NULL
  AND source_program IS NOT NULL
  AND (sexo IS NULL OR sexo IN ('M', 'F'))
  AND (tipo_identificacion IS NULL OR tipo_identificacion IN (
    'CC', 'TI', 'RC', 'CE', 'PA', 'CD', 'PE', 'SC', 'DE', 'MS', 'AS', 'CN'
  ))
  AND (fecha_nacimiento IS NULL OR fecha_nacimiento ~ '^\d{4}-\d{2}-\d{2}$')
  AND (codigo_pertenencia_etnica IS NULL OR codigo_pertenencia_etnica BETWEEN 1 AND 6)
  AND (gestante IS NULL OR gestante IN (0, 1, 2, 21))
);

CREATE POLICY "delete_patient_records"
ON patient_records
FOR DELETE
TO anon
USING (
  reporting_period IS NOT NULL
  AND numero_identificacion IS NOT NULL
);
