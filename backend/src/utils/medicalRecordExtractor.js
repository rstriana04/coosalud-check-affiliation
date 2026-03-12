import { logger } from './logger.js';
import { PDFProcessor } from './pdfProcessor.js';

/**
 * Medical Record Extractor
 * 
 * Hybrid approach combining:
 * 1. Rule-based extraction for structured data (vital signs, dates, etc.)
 * 2. LLM-based extraction for unstructured clinical data
 * 3. Pattern learning for improved accuracy over time
 */
export class MedicalRecordExtractor {
  constructor(pdfPath, options = {}) {
    this.pdfPath = pdfPath;
    this.pdfProcessor = new PDFProcessor(pdfPath);
    this.textContent = null;
    this.useLLM = options.useLLM !== false; // Default to true
    this.llmProvider = options.llmProvider || 'openai'; // 'openai', 'anthropic', 'local'
    this.llmApiKey = options.llmApiKey || process.env.OPENAI_API_KEY;
  }

  /**
   * Extract all required data for RCV format Excel
   */
  async extractRCVData(fechaAtencion) {
    try {
      logger.info('Extracting RCV data from medical record', { pdfPath: this.pdfPath });

      // Get full text content
      if (!this.textContent) {
        this.textContent = await this.pdfProcessor.extractText();
      }

      // Extract structured data using rules
      const structuredData = this.extractStructuredData(fechaAtencion);

      // Extract unstructured data using LLM if available
      let unstructuredData = {};
      if (this.useLLM && this.llmApiKey) {
        try {
          unstructuredData = await this.extractWithLLM(this.textContent);
        } catch (llmError) {
          logger.warn('LLM extraction failed, falling back to rule-based', { 
            error: llmError.message 
          });
          unstructuredData = this.extractUnstructuredDataFallback(this.textContent);
        }
      } else {
        unstructuredData = this.extractUnstructuredDataFallback(this.textContent);
      }

      // Merge structured and unstructured data
      const rcvData = {
        ...structuredData,
        ...unstructuredData
      };

      logger.info('RCV data extracted successfully', { 
        pdfPath: this.pdfPath,
        fieldsExtracted: Object.keys(rcvData).length
      });

      return rcvData;
    } catch (error) {
      logger.error('Error extracting RCV data', { 
        pdfPath: this.pdfPath,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Extract structured data using regex patterns
   */
  extractStructuredData(fechaAtencion) {
    const text = this.textContent;
    const data = {};

    // Extract patient name components
    const nombreMatch = text.match(/Nombre del paciente:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+)\s*-\s*(\d+)/i);
    if (nombreMatch) {
      const fullName = nombreMatch[1].trim();
      const nameParts = this.parseName(fullName);
      data.primerApellido = nameParts.apellido1 || '';
      data.segundoApellido = nameParts.apellido2 || '';
      data.primerNombre = nameParts.nombre1 || '';
      data.segundoNombre = nameParts.nombre2 || '';
    }

    // Extract identification
    const idMatch = text.match(/identificación:\s*(CC|TI|CE|PA|RC|PT)\s*(\d+)/i);
    if (idMatch) {
      data.tipoIdentificacion = idMatch[1].toUpperCase();
      data.numeroIdentificacion = idMatch[2];
    }

    // Extract address
    const direccionMatch = text.match(/Dirección:\s*([A-Za-z0-9#\-\s]+?)\s+Teléfono/i);
    if (direccionMatch) {
      data.direccionResidencia = direccionMatch[1].trim();
    }

    // Extract phone
    const telefonoMatch = text.match(/Teléfono:\s*(\d+)/i);
    if (telefonoMatch) {
      data.telefonos = telefonoMatch[1];
    }

    // Extract birth date
    const fechaNacMatch = text.match(/Fecha nacimiento:\s*(\d{4}-\d{2}-\d{2})/i);
    if (fechaNacMatch) {
      data.fechaNacimiento = fechaNacMatch[1];
    }

    // Extract age at consultation
    const edadMatch = text.match(/Edad:\s*(\d+)/i);
    if (edadMatch) {
      data.edadConsulta = parseInt(edadMatch[1]);
    } else if (data.fechaNacimiento && fechaAtencion) {
      // Calculate age if not found
      data.edadConsulta = this.calculateAge(data.fechaNacimiento, fechaAtencion);
    }

    // Extract sex
    const sexoMatch = text.match(/Sexo:\s*([MF])\s/i);
    if (sexoMatch) {
      data.sexo = sexoMatch[1];
    }

    // Extract vital signs - Weight
    const pesoMatch = text.match(/PESO\s*(?:\(KG\))?\s*(\d+(?:\.\d+)?)/i) || 
                     text.match(/PESO\s+(\d+(?:\.\d+)?)\s*(?:KG|kg)/i);
    if (pesoMatch) {
      data.pesoKg = parseFloat(pesoMatch[1]);
    }

    // Extract vital signs - Height
    const tallaMatch = text.match(/TALLA\s*(?:\(CM\))?\s*(\d+(?:\.\d+)?)/i) ||
                      text.match(/TALLA\s+(\d+(?:\.\d+)?)\s*(?:CM|cm)/i);
    if (tallaMatch) {
      data.tallaCm = parseFloat(tallaMatch[1]);
    }

    // Calculate IMC (BMI)
    if (data.pesoKg && data.tallaCm) {
      const alturaMetros = data.tallaCm / 100;
      data.imc = parseFloat((data.pesoKg / (alturaMetros * alturaMetros)).toFixed(2));
    }

    // Extract vital signs - Blood Pressure
    const presionMatch = text.match(/(?:PRESION ARTERIAL|PA|P\.A\.?)\s*(?:\(mmHg\))?\s*(\d+\/\d+)/i) ||
                        text.match(/(\d{2,3}\/\d{2,3})\s*(?:mmHg|mm Hg)/i);
    if (presionMatch) {
      data.presionArterial = presionMatch[1];
    }

    // Extract vital signs - Heart Rate
    const fcMatch = text.match(/(?:FRECUENCIA CARDIACA|FC|F\.C\.?)\s*(?:\(lpm\))?\s*(\d+)/i) ||
                   text.match(/FC\s*(\d+)\s*(?:lpm|x')/i);
    if (fcMatch) {
      data.frecuenciaCardiaca = fcMatch[1];
    }

    // Extract vital signs - Respiratory Rate
    const frMatch = text.match(/(?:FRECUENCIA RESPIRATORIA|FR|F\.R\.?)\s*(?:\(rpm\))?\s*(\d+)/i) ||
                   text.match(/FR\s*(\d+)\s*(?:rpm|x')/i);
    if (frMatch) {
      data.frecuenciaRespiratoria = frMatch[1];
    }

    // Extract vital signs - Temperature
    const tempMatch = text.match(/(?:TEMPERATURA|TEMP|T°)\s*(?:\(°C\))?\s*(\d+(?:\.\d+)?)/i) ||
                     text.match(/(\d{2}(?:\.\d+)?)\s*°C/i);
    if (tempMatch) {
      data.temperatura = tempMatch[1];
    }

    // Extract vital signs - Oxygen Saturation
    const satMatch = text.match(/(?:SATURACION|SAT\.?\s*O2|SpO2)\s*(?:\(%\))?\s*(\d+)/i) ||
                    text.match(/(\d{2,3})\s*%\s*(?:O2|SpO2)/i);
    if (satMatch) {
      data.saturacionO2 = satMatch[1];
    }

    // Extract Motivo de Consulta
    const motivoMatch = text.match(/MOTIVO DE CONSULTA[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i);
    if (motivoMatch) {
      data.motivoConsulta = motivoMatch[1].trim().substring(0, 500);
    }

    // Extract Enfermedad Actual
    const enfermedadMatch = text.match(/ENFERMEDAD ACTUAL[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (enfermedadMatch) {
      data.enfermedadActual = enfermedadMatch[1].trim().substring(0, 500);
    }

    // Extract Antecedentes Personales
    const antPersonalesMatch = text.match(/ANTECEDENTES PERSONALES[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (antPersonalesMatch) {
      data.antecedentesPersonales = antPersonalesMatch[1].trim().substring(0, 500);
    }

    // Extract Antecedentes Familiares
    const antFamiliaresMatch = text.match(/ANTECEDENTES FAMILIARES[:\s]+([^\n]+(?:\n[^\n]+){0,3})/i);
    if (antFamiliaresMatch) {
      data.antecedentesFamiliares = antFamiliaresMatch[1].trim().substring(0, 500);
    }

    // Extract Revisión por Sistemas
    const revisionMatch = text.match(/REVISION POR SISTEMAS[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (revisionMatch) {
      data.revisionSistemas = revisionMatch[1].trim().substring(0, 500);
    }

    // Extract Examen Físico
    const examenMatch = text.match(/EXAMEN FISICO[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (examenMatch) {
      data.examenFisico = examenMatch[1].trim().substring(0, 500);
    }

    // Extract Diagnóstico Principal
    const diagPrincipalMatch = text.match(/DIAGNOSTICO PRINCIPAL[:\s]+([^\n]+)/i) ||
                              text.match(/DIAGNOSTICO[:\s]+([^\n]+)/i);
    if (diagPrincipalMatch) {
      data.diagnosticoPrincipal = diagPrincipalMatch[1].trim().substring(0, 500);
    }

    // Extract Plan de Manejo
    const planMatch = text.match(/PLAN DE MANEJO[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i) ||
                     text.match(/PLAN[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (planMatch) {
      data.planManejo = planMatch[1].trim().substring(0, 500);
    }

    // Extract consultation date
    data.fecha = fechaAtencion || this.extractFechaConsulta(text);

    // Extract tipo de inscripción (first time vs follow-up)
    data.tipoInscripcion = this.extractTipoInscripcion(text);

    return data;
  }

  /**
   * Extract unstructured data using LLM
   */
  async extractWithLLM(text) {
    try {
      const prompt = this.buildLLMPrompt(text);
      
      if (this.llmProvider === 'openai') {
        return await this.callOpenAI(prompt);
      } else if (this.llmProvider === 'anthropic') {
        return await this.callAnthropic(prompt);
      } else if (this.llmProvider === 'ollama') {
        return await this.callOllama(prompt);
      } else if (this.llmProvider === 'custom' || this.llmProvider === 'fine-tuned') {
        return await this.callCustomAPI(prompt);
      } else {
        throw new Error(`Unsupported LLM provider: ${this.llmProvider}`);
      }
    } catch (error) {
      logger.error('LLM extraction error', { error: error.message });
      throw error;
    }
  }

  /**
   * Build prompt for LLM extraction
   */
  buildLLMPrompt(text) {
    // Truncate text if too long (keep first 8000 chars for context)
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...' : text;

    return `Eres un experto en extracción de datos de historias clínicas médicas. 
Analiza el siguiente texto de una historia clínica y extrae la información solicitada.

TEXTO DE LA HISTORIA CLÍNICA:
${truncatedText}

INSTRUCCIONES:
1. Extrae datos paraclínicos (laboratorios, exámenes) si están presentes
2. Identifica diagnósticos adicionales además del principal
3. Extrae medicamentos prescritos
4. Identifica procedimientos realizados
5. Extrae cualquier dato clínico relevante que no esté en secciones estructuradas

Responde SOLO con un objeto JSON válido con la siguiente estructura:
{
  "paraclinicos": "descripción de exámenes paraclínicos si existen",
  "diagnosticosAdicionales": "diagnósticos secundarios si existen",
  "medicamentos": "medicamentos prescritos si existen",
  "procedimientos": "procedimientos realizados si existen",
  "observaciones": "cualquier observación clínica relevante"
}

Si algún campo no está presente en el texto, usa una cadena vacía "".`;
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt) {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: this.llmApiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
      messages: [
        { role: 'system', content: 'You are a medical data extraction expert. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  }

  /**
   * Call Anthropic API
   */
  async callAnthropic(prompt) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: this.llmApiKey });

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Cost-effective model
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const content = response.content[0].text;
    return JSON.parse(content);
  }

  /**
   * Call Ollama (local models)
   */
  async callOllama(prompt) {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    
    // Use chat API with structured JSON format
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a medical data extraction expert. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        format: {
          type: 'object',
          properties: {
            paraclinicos: { type: 'string' },
            diagnosticosAdicionales: { type: 'string' },
            medicamentos: { type: 'string' },
            procedimientos: { type: 'string' },
            observaciones: { type: 'string' }
          },
          required: ['paraclinicos', 'diagnosticosAdicionales', 'medicamentos', 'procedimientos', 'observaciones']
        },
        options: {
          temperature: 0.1,
          num_predict: 1000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.message?.content || data.response;
    
    if (!content) {
      throw new Error('No content in Ollama response');
    }

    // Try to parse JSON
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      // Fallback: try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      logger.error('Could not parse JSON from Ollama', { 
        content: content.substring(0, 200),
        error: parseError.message 
      });
      throw new Error('Could not parse JSON from Ollama response');
    }
  }

  /**
   * Call custom API (for fine-tuned models or custom endpoints)
   */
  async callCustomAPI(prompt) {
    const apiUrl = process.env.CUSTOM_LLM_URL || process.env.FINE_TUNED_MODEL_URL;
    const apiKey = process.env.CUSTOM_LLM_API_KEY || this.llmApiKey;
    
    if (!apiUrl) {
      throw new Error('Custom LLM URL not configured. Set CUSTOM_LLM_URL or FINE_TUNED_MODEL_URL');
    }

    // Support OpenAI-compatible API format
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify({
        model: process.env.CUSTOM_LLM_MODEL || 'fine-tuned-model',
        messages: [
          { role: 'system', content: 'You are a medical data extraction expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.content || data.response;
    
    if (!content) {
      throw new Error('No content in custom API response');
    }

    return JSON.parse(content);
  }

  /**
   * Fallback extraction using enhanced regex patterns
   */
  extractUnstructuredDataFallback(text) {
    const data = {};

    // Try to extract paraclinical data
    const paraclinicosPatterns = [
      /(?:PARACL[IÍ]NICOS?|EX[ÁA]MENES?|LABORATORIOS?)[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i,
      /(?:GLUCOSA|HEMOGLOBINA|COLESTEROL|TRIGLIC[ÉE]RIDOS|CREATININA)[:\s]+([^\n]+)/i
    ];

    for (const pattern of paraclinicosPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.paraclinicos = match[1].trim().substring(0, 500); // Limit length
        break;
      }
    }

    // Try to extract medications
    const medicamentosPatterns = [
      /(?:MEDICAMENTOS?|TRATAMIENTO|FORMULACI[ÓO]N)[:\s]+([^\n]+(?:\n[^\n]+){0,10})/i,
      /(?:EN TRATAMIENTO CON|MEDICAMENTOS PRESCRITOS)[:\s]+([^\n]+(?:\n[^\n]+){0,10})/i
    ];

    for (const pattern of medicamentosPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.medicamentos = match[1].trim().substring(0, 500);
        break;
      }
    }

    // Try to extract additional diagnoses
    const diagnosticosPatterns = [
      /(?:DIAGN[ÓO]STICOS? ADICIONALES?|DIAGN[ÓO]STICOS? SECUNDARIOS?)[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i,
      /(?:IMPRESI[ÓO]N DIAGN[ÓO]STICA)[:\s]+([^\n]+)/i
    ];

    for (const pattern of diagnosticosPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.diagnosticosAdicionales = match[1].trim().substring(0, 500);
        break;
      }
    }

    return {
      paraclinicos: data.paraclinicos || '',
      diagnosticosAdicionales: data.diagnosticosAdicionales || '',
      medicamentos: data.medicamentos || '',
      procedimientos: '',
      observaciones: ''
    };
  }

  /**
   * Parse full name into components
   */
  parseName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 1) {
      return { nombre1: parts[0], nombre2: '', apellido1: '', apellido2: '' };
    } else if (parts.length === 2) {
      return { nombre1: parts[0], nombre2: '', apellido1: parts[1], apellido2: '' };
    } else if (parts.length === 3) {
      return { nombre1: parts[0], nombre2: '', apellido1: parts[1], apellido2: parts[2] };
    } else {
      // Assume: nombre1 nombre2 apellido1 apellido2
      return {
        nombre1: parts[0] || '',
        nombre2: parts[1] || '',
        apellido1: parts[2] || '',
        apellido2: parts.slice(3).join(' ') || ''
      };
    }
  }

  /**
   * Calculate age from birth date and consultation date
   */
  calculateAge(fechaNacimiento, fechaConsulta) {
    try {
      const nac = new Date(fechaNacimiento);
      const cons = new Date(fechaConsulta);
      let age = cons.getFullYear() - nac.getFullYear();
      const monthDiff = cons.getMonth() - nac.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && cons.getDate() < nac.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      logger.warn('Error calculating age', { error: error.message });
      return null;
    }
  }

  /**
   * Extract consultation date from text
   */
  extractFechaConsulta(text) {
    const fechaMatch = text.match(/Fecha:\s*(\d{4}-\d{2}-\d{2})/i);
    if (fechaMatch) {
      return fechaMatch[1];
    }
    return '';
  }

  /**
   * Determine if this is first-time or follow-up consultation
   */
  extractTipoInscripcion(text) {
    const firstTimeIndicators = [
      /1[°º]?\s*VEZ/i,
      /PRIMERA\s+CONSULTA/i,
      /NUEVO\s+PACIENTE/i,
      /INICIO\s+DE\s+TRATAMIENTO/i
    ];

    for (const pattern of firstTimeIndicators) {
      if (pattern.test(text)) {
        return '1° VEZ';
      }
    }

    return 'CONTROL'; // Default to follow-up
  }
}

/**
 * Extract RCV format data from PDF
 */
export const extractRCVDataFromPDF = async (pdfPath, fechaAtencion, options = {}) => {
  const extractor = new MedicalRecordExtractor(pdfPath, options);
  return await extractor.extractRCVData(fechaAtencion);
};

