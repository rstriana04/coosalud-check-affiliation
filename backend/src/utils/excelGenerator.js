import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';

export class ExcelGenerator {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.worksheet = null;
  }

  createWorksheet(sheetName = 'Pacientes') {
    this.worksheet = this.workbook.addWorksheet(sheetName);
    
    this.worksheet.columns = [
      { header: 'Nombre del paciente', key: 'nombre', width: 40 },
      { header: 'Identificación', key: 'identificacion', width: 15 },
      { header: 'Sexo', key: 'sexo', width: 10 },
      { header: 'Fecha nacimiento', key: 'fechaNacimiento', width: 20 },
      { header: 'Ocupación', key: 'ocupacion', width: 25 },
      { header: 'Tipo vinculación', key: 'tipoVinculacion', width: 15 },
      { header: 'Régimen', key: 'regimen', width: 20 },
      { header: 'Ciudad', key: 'ciudad', width: 25 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Correo', key: 'correo', width: 30 },
      { header: 'EPS', key: 'eps', width: 30 },
      { header: 'Tipo de discapacidad', key: 'tipoDiscapacidad', width: 20 },
      { header: 'Identidad de genero', key: 'identidadGenero', width: 20 }
    ];

    this.worksheet.getRow(1).font = { bold: true };
    this.worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    logger.debug('Excel worksheet created');
  }

  addPatientData(patientDataArray) {
    if (!this.worksheet) {
      this.createWorksheet();
    }

    patientDataArray.forEach(patientData => {
      this.worksheet.addRow({
        nombre: patientData.nombre || '',
        identificacion: patientData.identificacion || '',
        sexo: patientData.sexo || '',
        fechaNacimiento: patientData.fechaNacimiento || '',
        ocupacion: patientData.ocupacion || '',
        tipoVinculacion: patientData.tipoVinculacion || '',
        regimen: patientData.regimen || '',
        ciudad: patientData.ciudad || '',
        direccion: patientData.direccion || '',
        telefono: patientData.telefono || '',
        correo: patientData.correo || '',
        eps: patientData.eps || '',
        tipoDiscapacidad: patientData.tipoDiscapacidad || '',
        identidadGenero: patientData.identidadGenero || ''
      });
    });

    logger.info('Patient data added to Excel', { rowCount: patientDataArray.length });
  }

  async save(outputPath) {
    try {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await this.workbook.xlsx.writeFile(outputPath);
      logger.info('Excel file saved', { outputPath });
      return outputPath;
    } catch (error) {
      logger.error('Error saving Excel file', { error: error.message });
      throw error;
    }
  }
}

export const generatePatientExcel = async (patientDataArray, outputPath) => {
  const generator = new ExcelGenerator();
  generator.createWorksheet();
  generator.addPatientData(patientDataArray);
  return await generator.save(outputPath);
};

