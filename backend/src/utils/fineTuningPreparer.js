import { logger } from './logger.js';
import { PDFProcessor } from './pdfProcessor.js';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Fine-Tuning Data Preparer
 * 
 * Prepares medical records for fine-tuning open source models
 * Converts PDFs into training data format (JSONL for OpenAI, or custom format)
 */
export class FineTuningPreparer {
  constructor(pdfsDirectory, outputDirectory) {
    this.pdfsDirectory = pdfsDirectory;
    this.outputDirectory = outputDirectory;
    this.pdfProcessor = null;
  }

  /**
   * Prepare training data from PDFs
   * @param {Object} options - Configuration options
   * @param {string} options.format - 'openai', 'llama', 'mistral', 'custom'
   * @param {boolean} options.includeExamples - Include example extractions
   */
  async prepareTrainingData(options = {}) {
    try {
      const {
        format = 'openai',
        includeExamples = true
      } = options;

      logger.info('Preparing fine-tuning data', { 
        pdfsDirectory: this.pdfsDirectory,
        format,
        includeExamples
      });

      const pdfFiles = await this.getPDFFiles();
      logger.info(`Found ${pdfFiles.length} PDF files`);

      const trainingExamples = [];

      for (const pdfFile of pdfFiles) {
        try {
          const pdfPath = join(this.pdfsDirectory, pdfFile);
          const example = await this.createTrainingExample(pdfPath, format, includeExamples);
          
          if (example) {
            trainingExamples.push(example);
            logger.debug('Created training example', { pdfFile });
          }
        } catch (error) {
          logger.warn('Failed to process PDF for training', { 
            pdfFile, 
            error: error.message 
          });
        }
      }

      // Save training data
      const outputPath = await this.saveTrainingData(trainingExamples, format);
      
      logger.info('Fine-tuning data prepared successfully', {
        examples: trainingExamples.length,
        outputPath
      });

      return {
        examples: trainingExamples.length,
        outputPath,
        format
      };
    } catch (error) {
      logger.error('Error preparing fine-tuning data', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all PDF files from directory
   */
  async getPDFFiles() {
    const files = await readdir(this.pdfsDirectory);
    return files.filter(file => file.toLowerCase().endsWith('.pdf'));
  }

  /**
   * Create a training example from a PDF
   */
  async createTrainingExample(pdfPath, format, includeExamples) {
    try {
      const processor = new PDFProcessor(pdfPath);
      const text = await processor.extractText();

      if (!text || text.length < 100) {
        logger.warn('PDF text too short, skipping', { pdfPath });
        return null;
      }

      // Truncate text for training (keep first 6000 chars to leave room for response)
      const truncatedText = text.length > 6000 ? text.substring(0, 6000) + '...' : text;

      // Extract structured data as "ground truth" (for supervised learning)
      const structuredData = this.extractGroundTruth(text);

      const prompt = this.buildTrainingPrompt(truncatedText);
      const completion = this.formatCompletion(structuredData, format);

      if (format === 'openai') {
        return {
          messages: [
            {
              role: 'system',
              content: 'You are a medical data extraction expert. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            },
            {
              role: 'assistant',
              content: completion
            }
          ]
        };
      } else if (format === 'llama' || format === 'mistral') {
        // Format for Llama/Mistral fine-tuning
        return {
          instruction: prompt,
          output: completion,
          input: ''
        };
      } else {
        // Custom format
        return {
          prompt: prompt,
          completion: completion,
          metadata: {
            pdfPath,
            textLength: text.length
          }
        };
      }
    } catch (error) {
      logger.error('Error creating training example', { pdfPath, error: error.message });
      return null;
    }
  }

  /**
   * Extract ground truth data from PDF text
   */
  extractGroundTruth(text) {
    // Use rule-based extraction to get "ground truth"
    // In production, you'd manually review and correct these
    const data = {};

    // Extract medications
    const medicamentosMatch = text.match(/EN TRATAMIENTO CON\s+([^\.]+(?:\.[^\.]+){0,5})/i) ||
                            text.match(/MEDICAMENTOS[:\s]+([^\.]+(?:\.[^\.]+){0,5})/i);
    if (medicamentosMatch) {
      data.medicamentos = medicamentosMatch[1].trim().substring(0, 500);
    }

    // Extract paraclinical data
    const paraclinicosMatch = text.match(/(?:PARACL[IÍ]NICOS?|EX[ÁA]MENES?|LABORATORIOS?)[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (paraclinicosMatch) {
      data.paraclinicos = paraclinicosMatch[1].trim().substring(0, 500);
    }

    // Extract additional diagnoses
    const diagnosticosMatch = text.match(/IMPRESI[ÓO]N DIAGN[ÓO]STICA[:\s]+([^\n]+)/i);
    if (diagnosticosMatch) {
      data.diagnosticosAdicionales = diagnosticosMatch[1].trim().substring(0, 500);
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
   * Build training prompt
   */
  buildTrainingPrompt(text) {
    return `Eres un experto en extracción de datos de historias clínicas médicas. 
Analiza el siguiente texto de una historia clínica y extrae la información solicitada.

TEXTO DE LA HISTORIA CLÍNICA:
${text}

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
   * Format completion for training
   */
  formatCompletion(data, format) {
    if (format === 'openai') {
      return JSON.stringify(data, null, 2);
    } else {
      // For other formats, return JSON string
      return JSON.stringify(data);
    }
  }

  /**
   * Save training data in appropriate format
   */
  async saveTrainingData(examples, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'openai') {
      // OpenAI fine-tuning format: JSONL
      const jsonlPath = join(this.outputDirectory, `training-data-${timestamp}.jsonl`);
      const jsonlContent = examples.map(ex => JSON.stringify(ex)).join('\n');
      await writeFile(jsonlPath, jsonlContent, 'utf-8');
      return jsonlPath;
    } else if (format === 'llama' || format === 'mistral') {
      // Llama/Mistral format: JSON array
      const jsonPath = join(this.outputDirectory, `training-data-${timestamp}.json`);
      await writeFile(jsonPath, JSON.stringify(examples, null, 2), 'utf-8');
      return jsonPath;
    } else {
      // Custom format: JSON array
      const jsonPath = join(this.outputDirectory, `training-data-${timestamp}.json`);
      await writeFile(jsonPath, JSON.stringify(examples, null, 2), 'utf-8');
      return jsonPath;
    }
  }
}

/**
 * Prepare fine-tuning data from PDFs
 */
export const prepareFineTuningData = async (pdfsDirectory, outputDirectory, options = {}) => {
  const preparer = new FineTuningPreparer(pdfsDirectory, outputDirectory);
  return await preparer.prepareTrainingData(options);
};

