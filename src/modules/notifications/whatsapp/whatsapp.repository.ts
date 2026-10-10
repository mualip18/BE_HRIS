import pool from '../../../config/db';
import { WhatsAppLog } from './whatsapp.types';

export class WhatsAppRepository {
  async createLog(
    messageId: number | null,
    recipientPhone: string,
    status: 'PENDING' | 'SENT' | 'FAILED',
    errorMessage?: string
  ): Promise<WhatsAppLog> {
    const query = `
      INSERT INTO whatsapp_logs (message_id, recipient_phone, status, error_message, attempts, last_attempt_at)
      VALUES ($1, $2, $3, $4, 1, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [
      messageId,
      recipientPhone,
      status,
      errorMessage || null,
    ]);
    return result.rows[0];
  }

  async updateLogStatus(
    id: number,
    status: 'PENDING' | 'SENT' | 'FAILED',
    errorMessage?: string
  ): Promise<void> {
    const query = `
      UPDATE whatsapp_logs
      SET status = $1,
          error_message = $2,
          attempts = attempts + 1,
          last_attempt_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
    `;
    await pool.query(query, [status, errorMessage || null, id]);
  }

  async getLogById(id: number): Promise<WhatsAppLog | null> {
    const result = await pool.query('SELECT * FROM whatsapp_logs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}