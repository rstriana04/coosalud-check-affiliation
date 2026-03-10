import { Resend } from 'resend';
import { config } from '../config/config.js';
import { logger } from './logger.js';
import { promises as fs } from 'fs';
import { basename } from 'path';

let resendClient = null;

function getClient() {
  if (!resendClient) {
    if (!config.email.apiKey) {
      throw new Error('RESEND_API_KEY no configurada');
    }
    resendClient = new Resend(config.email.apiKey);
  }
  return resendClient;
}

export async function sendReportEmail(to, zipPath, summary) {
  const client = getClient();

  const fileBuffer = await fs.readFile(zipPath);
  const fileName = basename(zipPath);

  const { data, error } = await client.emails.send({
    from: config.email.from,
    to: [to],
    subject: `Informe RCV - ${summary.fecha || new Date().toISOString().split('T')[0]}`,
    html: buildEmailHtml(summary),
    attachments: [
      {
        filename: fileName,
        content: fileBuffer.toString('base64')
      }
    ]
  });

  if (error) {
    logger.error('Error enviando email', { to, error });
    throw new Error(`Error enviando email: ${error.message}`);
  }

  logger.info('Email enviado exitosamente', { to, emailId: data?.id });
  return data;
}

function buildEmailHtml(summary) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Informe RCV Generado</h2>
      <p>El informe de Riesgo Cardiovascular ha sido procesado exitosamente.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr style="background: #f8f9fa;">
          <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>Total pacientes</strong></td>
          <td style="padding: 8px; border: 1px solid #dee2e6;">${summary.total || 0}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>Exitosos</strong></td>
          <td style="padding: 8px; border: 1px solid #dee2e6; color: #28a745;">${summary.successful || 0}</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>Fallidos</strong></td>
          <td style="padding: 8px; border: 1px solid #dee2e6; color: #dc3545;">${summary.failed || 0}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>Programa</strong></td>
          <td style="padding: 8px; border: 1px solid #dee2e6;">${summary.programa || 'RCV'}</td>
        </tr>
      </table>
      <p>El archivo ZIP adjunto contiene el Excel del informe y las historias cl&iacute;nicas en PDF.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #6c757d; font-size: 12px;">Generado autom&aacute;ticamente por ADRES Automation</p>
    </div>
  `;
}
