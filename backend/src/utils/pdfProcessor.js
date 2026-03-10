import PDFParser from 'pdf2json';
import { logger } from './logger.js';

export class PDFProcessor {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.textContent = null;
  }

  async extractText() {
    try {
      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on('pdfParser_dataError', (errData) => {
          logger.error('Error parsing PDF', { 
            pdfPath: this.pdfPath,
            error: errData.parserError 
          });
          reject(new Error(errData.parserError));
        });

        pdfParser.on('pdfParser_dataReady', (pdfData) => {
          try {
            // Extract text manually from the parsed data
            let textContent = '';
            
            if (pdfData.Pages) {
              for (const page of pdfData.Pages) {
                if (page.Texts) {
                  for (const textItem of page.Texts) {
                    if (textItem.R) {
                      for (const run of textItem.R) {
                        if (run.T) {
                          try {
                            // Decode URI component (pdf2json encodes text)
                            const decodedText = decodeURIComponent(run.T);
                            textContent += decodedText + ' ';
                          } catch (decodeError) {
                            // If decoding fails, use the raw text
                            textContent += run.T + ' ';
                          }
                        }
                      }
                    }
                  }
                  textContent += '\n'; // Add newline after each page
                }
              }
            }
            
            this.textContent = textContent;
            
            logger.debug('PDF text extracted', { 
              pdfPath: this.pdfPath,
              textLength: this.textContent.length,
              pages: pdfData.Pages?.length || 0
            });
            
            resolve(this.textContent);
          } catch (error) {
            logger.error('Error getting raw text content', {
              pdfPath: this.pdfPath,
              error: error.message
            });
            reject(error);
          }
        });

        pdfParser.loadPDF(this.pdfPath);
      });
    } catch (error) {
      logger.error('Error extracting PDF text', { 
        pdfPath: this.pdfPath,
        error: error.message 
      });
      throw error;
    }
  }

  extractField(fieldName, text) {
    const patterns = {
      'nombre': /Nombre del paciente:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+)\s*-\s*(\d+)/i,
      'identificacion': /identificación:\s*(CC|TI|CE|PA|RC)\s*(\d+)/i,
      'sexo': /Sexo:\s*([MF])\s/i,
      'fechaNacimiento': /Fecha nacimiento:\s*(\d{4}-\d{2}-\d{2})/i,
      'ocupacion': /Ocupación:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s+Tipo vinculación/i,
      'tipoVinculacion': /Tipo vinculación:\s*([A-Z])\s/i,
      'regimen': /Régimen:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s+Ciudad/i,
      'ciudad': /Ciudad:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s*\(/i,
      'direccion': /Dirección:\s*([A-Za-z0-9#\-\s]+?)\s+Teléfono/i,
      'telefono': /Teléfono:\s*(\d+)/i,
      'correo': /Correo:\s*([A-Za-z0-9@._\-]+)/i,
      'eps': /EPS:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s+Tipo de discapacidad/i,
      'tipoDiscapacidad': /Tipo de discapacidad:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s+Identidad de genero/i,
      'identidadGenero': /Identidad de genero:\s*([A-Za-zÁÉÍÓÚáéíóúÑñ\s]+?)\s+GENERALIDADES/i
    };

    const pattern = patterns[fieldName];
    if (!pattern) {
      return '';
    }

    const match = text.match(pattern);
    if (!match) {
      return '';
    }

    // Handle special cases
    if (fieldName === 'nombre') {
      return match[1].trim();
    } else if (fieldName === 'identificacion') {
      return `${match[1]} ${match[2]}`;
    }

    return match[1].trim();
  }

  async extractPatientData() {
    try {
      if (!this.textContent) {
        await this.extractText();
      }

      const patientData = {
        nombre: this.extractField('nombre', this.textContent),
        identificacion: this.extractField('identificacion', this.textContent),
        sexo: this.extractField('sexo', this.textContent),
        fechaNacimiento: this.extractField('fechaNacimiento', this.textContent),
        ocupacion: this.extractField('ocupacion', this.textContent),
        tipoVinculacion: this.extractField('tipoVinculacion', this.textContent),
        regimen: this.extractField('regimen', this.textContent),
        ciudad: this.extractField('ciudad', this.textContent),
        direccion: this.extractField('direccion', this.textContent),
        telefono: this.extractField('telefono', this.textContent),
        correo: this.extractField('correo', this.textContent),
        eps: this.extractField('eps', this.textContent),
        tipoDiscapacidad: this.extractField('tipoDiscapacidad', this.textContent),
        identidadGenero: this.extractField('identidadGenero', this.textContent)
      };

      logger.info('Patient data extracted from PDF', { 
        pdfPath: this.pdfPath,
        nombre: patientData.nombre 
      });

      return patientData;
    } catch (error) {
      logger.error('Error extracting patient data from PDF', { 
        pdfPath: this.pdfPath,
        error: error.message 
      });
      throw error;
    }
  }
}

export const extractPatientDataFromPDF = async (pdfPath) => {
  const processor = new PDFProcessor(pdfPath);
  return await processor.extractPatientData();
};

