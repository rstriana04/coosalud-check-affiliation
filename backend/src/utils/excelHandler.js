import ExcelJS from 'exceljs';
import { ExcelColumns } from '../../../shared/types.js';
import { logger } from './logger.js';

export class ExcelHandler {
  constructor(filePath) {
    this.filePath = filePath;
    this.workbook = null;
    this.worksheet = null;
    this.records = [];
  }

  async read() {
    try {
      this.workbook = new ExcelJS.Workbook();
      await this.workbook.xlsx.readFile(this.filePath);
      
      this.worksheet = this.workbook.worksheets[0];
      
      if (!this.worksheet) {
        throw new Error('No worksheet found in Excel file');
      }

      const data = [];
      this.worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowValues = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rowValues.push(cell.value !== null && cell.value !== undefined ? String(cell.value) : '');
        });
        data.push(rowValues);
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

      const excelRowNumber = rowIndex + 1;
      const cell = this.worksheet.getRow(excelRowNumber).getCell(ExcelColumns.FECHA_AFILIACION);
      cell.value = fechaAfiliacion;

      logger.debug(`Updated row ${excelRowNumber} with date: ${fechaAfiliacion}`);
      return true;
    } catch (error) {
      logger.error('Error updating Excel record', { 
        rowIndex, 
        error: error.message 
      });
      return false;
    }
  }

  async save(outputPath) {
    try {
      if (!this.workbook) {
        throw new Error('Workbook not loaded');
      }

      await this.workbook.xlsx.writeFile(outputPath);
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

export const validateExcelFile = async (filePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      return { valid: false, error: 'No sheets found in Excel file' };
    }

    const worksheet = workbook.worksheets[0];
    const rowCount = worksheet.rowCount;

    if (rowCount < 4) {
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

