import XLSX from 'xlsx';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ExcelFilterService {
  constructor(filePath) {
    this.filePath = filePath;
    this.workbook = null;
    this.worksheet = null;
    this.diagnosticCodes = null;
  }

  async loadDiagnosticCodes() {
    try {
      const configPath = path.join(__dirname, '../../config/diagnostic-codes.json');
      const fileContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(fileContent);
      this.diagnosticCodes = config.codes;
      logger.info(`Loaded ${this.diagnosticCodes.length} diagnostic codes`);
    } catch (error) {
      logger.error('Error loading diagnostic codes', { error: error.message });
      throw new Error(`Failed to load diagnostic codes: ${error.message}`);
    }
  }

  async filterByEspecialidad(specialties = ['enfermeria', 'medicina general']) {
    try {
      logger.info('Starting Excel filtering process', { 
        filePath: this.filePath,
        specialties 
      });

      await this.loadDiagnosticCodes();

      this.workbook = XLSX.readFile(this.filePath, { cellDates: true, dateNF: 'yyyy-mm-dd' });
      
      const sheetNames = this.workbook.SheetNames;
      if (!sheetNames || sheetNames.length === 0) {
        throw new Error('No worksheet found in Excel file');
      }

      this.worksheet = this.workbook.Sheets[sheetNames[0]];
      
      const range = XLSX.utils.decode_range(this.worksheet['!ref']);
      const allRows = [];

      for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
        const rowData = {};
        
        for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
          const cell = this.worksheet[cellAddress];
          const columnLetter = this.getColumnLetter(colNum + 1);
          
          if (cell) {
            if (cell.t === 'd' && cell.v instanceof Date) {
              const year = cell.v.getUTCFullYear();
              const month = String(cell.v.getUTCMonth() + 1).padStart(2, '0');
              const day = String(cell.v.getUTCDate()).padStart(2, '0');
              rowData[columnLetter] = `${year}-${month}-${day}`;
            } else if (cell.w) {
              rowData[columnLetter] = cell.w;
            } else {
              rowData[columnLetter] = String(cell.v || '');
            }
          } else {
            rowData[columnLetter] = '';
          }
        }
        
        rowData._rowNumber = rowNum + 1;
        allRows.push(rowData);
      }

      logger.debug(`Total rows read: ${allRows.length}`);

      if (allRows.length === 0) {
        throw new Error('No data found in Excel file');
      }

      const headerRow = allRows[0];
      const especialidadColumnLetter = this.findEspecialidadColumn(headerRow);
      const diagnosticoColumnLetter = this.findDiagnosticoColumn(headerRow);

      if (!especialidadColumnLetter) {
        throw new Error('Column "especialidad" not found in Excel file');
      }

      if (!diagnosticoColumnLetter) {
        throw new Error('Column "diagnostico" not found in Excel file');
      }

      logger.info(`Found especialidad column: ${especialidadColumnLetter}`);
      logger.info(`Found diagnostico column: ${diagnosticoColumnLetter}`);

      let especialidadMatches = 0;
      let diagnosticoMatches = 0;
      let bothMatches = 0;

      const filteredRows = allRows.filter((row, index) => {
        if (index === 0) return true;

        const especialidadValue = row[especialidadColumnLetter] || '';
        const especialidadLower = especialidadValue.toLowerCase().trim();

        const matchesEspecialidad = specialties.some(specialty => 
          especialidadLower.includes(specialty.toLowerCase())
        );

        if (matchesEspecialidad) {
          especialidadMatches++;
        }

        const diagnosticoValue = row[diagnosticoColumnLetter] || '';
        const matchesDiagnostico = this.matchesDiagnosticCode(diagnosticoValue);

        if (matchesDiagnostico) {
          diagnosticoMatches++;
        }

        const matchesBoth = matchesEspecialidad && matchesDiagnostico;

        if (matchesBoth) {
          bothMatches++;
          logger.debug(`Row ${row._rowNumber} matched both filters`, { 
            especialidad: especialidadValue,
            diagnostico: diagnosticoValue
          });
        }

        return matchesBoth;
      });

      logger.info(`Filter results:`, {
        totalRows: allRows.length - 1,
        especialidadMatches,
        diagnosticoMatches,
        bothMatches,
        finalFiltered: filteredRows.length - 1
      });

      return filteredRows;
    } catch (error) {
      logger.error('Error filtering Excel file', { error: error.message });
      throw error;
    }
  }

  findEspecialidadColumn(headerRow) {
    for (const [columnLetter, cellValue] of Object.entries(headerRow)) {
      if (columnLetter === '_rowNumber') continue;
      
      const cellValueLower = String(cellValue).toLowerCase().trim();
      if (cellValueLower === 'especialidad') {
        return columnLetter;
      }
    }
    return null;
  }

  findDiagnosticoColumn(headerRow) {
    for (const [columnLetter, cellValue] of Object.entries(headerRow)) {
      if (columnLetter === '_rowNumber') continue;
      
      const cellValueLower = String(cellValue).toLowerCase().trim();
      if (cellValueLower === 'diagnostico') {
        return columnLetter;
      }
    }
    return null;
  }

  matchesDiagnosticCode(diagnosticoText) {
    if (!diagnosticoText || !this.diagnosticCodes) {
      return false;
    }

    const diagnosticoUpper = String(diagnosticoText).toUpperCase().trim();

    return this.diagnosticCodes.some(code => {
      const codeUpper = code.toUpperCase();
      return diagnosticoUpper.includes(codeUpper);
    });
  }

  getColumnLetter(colNumber) {
    let letter = '';
    while (colNumber > 0) {
      const remainder = (colNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      colNumber = Math.floor((colNumber - 1) / 26);
    }
    return letter;
  }

  async saveAsJson(filteredData, outputDir) {
    try {
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `filtered-rcb-${timestamp}.json`;
      const outputPath = path.join(outputDir, fileName);

      const jsonData = {
        metadata: {
          sourceFile: path.basename(this.filePath),
          filteredAt: new Date().toISOString(),
          totalRows: filteredData.length - 1,
          filters: {
            especialidades: ['enfermeria', 'medicina general'],
            diagnosticCodes: this.diagnosticCodes
          }
        },
        data: filteredData
      };

      await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');

      logger.info(`Filtered data saved as JSON`, { 
        outputPath,
        rowCount: filteredData.length - 1
      });

      return outputPath;
    } catch (error) {
      logger.error('Error saving JSON file', { error: error.message });
      throw error;
    }
  }
}

export const filterExcelByEspecialidad = async (filePath, outputDir) => {
  const filterService = new ExcelFilterService(filePath);
  const filteredData = await filterService.filterByEspecialidad(['enfermeria', 'medicina general']);
  const jsonPath = await filterService.saveAsJson(filteredData, outputDir);
  
  return {
    jsonPath,
    totalRows: filteredData.length - 1,
    filteredData
  };
};

