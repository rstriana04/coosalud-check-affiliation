import XLSX from 'xlsx';
import { ExcelColumns } from '../../../shared/types.js';
import { logger } from './logger.js';

export class ExcelHandler {
  constructor(filePath) {
    this.filePath = filePath;
    this.workbook = null;
    this.worksheet = null;
    this.records = [];
  }

  read() {
    try {
      this.workbook = XLSX.readFile(this.filePath);
      const sheetName = this.workbook.SheetNames[0];
      this.worksheet = this.workbook.Sheets[sheetName];
      
      const data = XLSX.utils.sheet_to_json(this.worksheet, { 
        header: 1,
        defval: '',
        raw: false
      });

      const headerRowIndex = 2;
      
      this.validateHeaders(data[headerRowIndex]);
      
      this.records = [];
      
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        
        if (!row || row.length === 0) continue;
        
        const tipoDocumento = row[ExcelColumns.TIPO_ID - 1];
        const numeroDocumento = row[ExcelColumns.NUMERO_ID - 1];
        
        if (!tipoDocumento || !numeroDocumento) {
          logger.warn(`Skipping row ${i + 1}: missing document type or number`);
          continue;
        }

        this.records.push({
          rowIndex: i,
          tipoDocumento: String(tipoDocumento).trim(),
          numeroDocumento: String(numeroDocumento).trim(),
          fechaAfiliacion: row[ExcelColumns.FECHA_AFILIACION - 1] || ''
        });
      }

      logger.info(`Excel file loaded: ${this.records.length} records found`);
      return this.records;
    } catch (error) {
      logger.error('Error reading Excel file', { error: error.message });
      throw new Error(`Failed to read Excel file: ${error.message}`);
    }
  }

  validateHeaders(headerRow) {
    if (!headerRow || headerRow.length === 0) {
      throw new Error('No headers found in row 3');
    }

    const expectedHeaders = {
      [ExcelColumns.TIPO_ID - 1]: 'Campo 5 Tipo de Identificación',
      [ExcelColumns.NUMERO_ID - 1]: 'Campo 6 Número de Identificación',
      [ExcelColumns.FECHA_AFILIACION - 1]: 'Campo 15 Fecha de afiliación'
    };

    const warnings = [];

    for (const [index, expectedText] of Object.entries(expectedHeaders)) {
      const actualHeader = headerRow[index];
      
      if (!actualHeader) {
        warnings.push(`Column ${parseInt(index) + 1} is empty`);
      } else if (!actualHeader.includes(expectedText)) {
        warnings.push(
          `Column ${parseInt(index) + 1}: expected "${expectedText}" but found "${actualHeader}"`
        );
      } else {
        logger.debug(`Column ${parseInt(index) + 1} header validated`, { 
          header: actualHeader 
        });
      }
    }

    if (warnings.length > 0) {
      logger.warn('Excel header validation warnings', { warnings });
      logger.info('Proceeding with positional column reading (columns 5, 6, 15)');
    } else {
      logger.info('Excel headers validated successfully');
    }
  }

  updateRecord(rowIndex, fechaAfiliacion) {
    try {
      if (!this.worksheet) {
        throw new Error('Worksheet not loaded');
      }

      const cellAddress = XLSX.utils.encode_cell({
        r: rowIndex,
        c: ExcelColumns.FECHA_AFILIACION - 1
      });

      this.worksheet[cellAddress] = {
        t: 's',
        v: fechaAfiliacion
      };

      logger.debug(`Updated row ${rowIndex + 1} with date: ${fechaAfiliacion}`);
      return true;
    } catch (error) {
      logger.error('Error updating Excel record', { 
        rowIndex, 
        error: error.message 
      });
      return false;
    }
  }

  save(outputPath) {
    try {
      if (!this.workbook) {
        throw new Error('Workbook not loaded');
      }

      XLSX.writeFile(this.workbook, outputPath);
      logger.info(`Excel file saved: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Error saving Excel file', { error: error.message });
      throw new Error(`Failed to save Excel file: ${error.message}`);
    }
  }

  getRecords() {
    return this.records;
  }

  getTotalRecords() {
    return this.records.length;
  }
}

export const validateExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { valid: false, error: 'No sheets found in Excel file' };
    }

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 4) {
      return { 
        valid: false, 
        error: 'Excel file must have at least 4 rows (metadata + headers + data)' 
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid Excel file: ${error.message}` };
  }
};

