import pool from "../../../config/db";
import { Message } from '../types/message.types';

export interface WhatsAppLog {
  id: number;
  message_id: number | null;
  recipient_phone: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error_message: string | null;
  attempts: number;
  last_attempt_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class MessageRepository {
  // Admin: kirim pesan ke kandidat (apply_id)
  async createMessage(
    applyId: number,
    senderId: string,
    receiverId: string,
    subject: string,
    body: string
  ): Promise<Message> {
    const query = `
      INSERT INTO messages (apply_id, sender_id, receiver_id, subject, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      applyId,
      senderId,
      receiverId,
      subject,
      body,
    ]);
    return result.rows[0];
  }

  // Admin: lihat semua pesan untuk suatu lamaran (apply_id)
  async getMessagesByApplyId(applyId: number): Promise<Message[]> {
    const query = `
      SELECT m.*, 
        (SELECT full_name FROM profiles WHERE user_id = m.sender_id) as sender_name
      FROM messages m
      WHERE m.apply_id = $1
      ORDER BY m.created_at DESC
    `;
    const result = await pool.query(query, [applyId]);
    return result.rows;
  }

  // User: lihat semua pesan untuk user login (berdasarkan receiver_id)
  async getMessagesByUserId(userId: string): Promise<Message[]> {
    const query = `
      SELECT m.*, 
        (SELECT nama_lengkap FROM job_applies WHERE id = m.apply_id) as apply_nama,
        (SELECT posisi FROM job_applies WHERE id = m.apply_id) as apply_posisi
      FROM messages m
      WHERE m.receiver_id = $1
      ORDER BY m.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // User: tandai pesan sudah dibaca
  async markAsRead(messageId: string): Promise<void> {
    await pool.query(
      'UPDATE messages SET is_read = true WHERE id = $1',
      [messageId]
    );
  }

  // Mendapatkan user_id pelamar dari apply_id
  async getUserIdByApplyId(applyId: number): Promise<string | null> {
    const result = await pool.query(
      `
      SELECT u.uuid
      FROM job_applies ja
      INNER JOIN users u
        ON u.uuid = ja.user_id
      WHERE ja.id = $1
      `,
      [applyId]
    );

    console.log("USER UUID:", result.rows[0]);

    return result.rows[0]?.uuid ?? null;
  }

  /**
   * Ambil nomor HP user dari apply_id (kolom: job_applies.no_hp).
   * Ini cara paling akurat untuk kandidat, karena no_hp tersimpan
   * di form lamaran, bukan di tabel users.
   */
  async getPhoneByApplyId(applyId: number): Promise<string | null> {
    try {
      const result = await pool.query(
        `
        SELECT no_hp
        FROM job_applies
        WHERE id = $1
        LIMIT 1
        `,
        [applyId]
      );

      const phone = result.rows[0]?.no_hp ?? null;

      if (phone) {
        console.log(
          `[MessageRepository] Phone found for apply ${applyId}:`,
          phone
        );
      } else {
        console.warn(
          `[MessageRepository] no_hp kosong untuk apply_id ${applyId}`
        );
      }

      return phone;
    } catch (err) {
      console.error('[MessageRepository] getPhoneByApplyId error:', err);
      return null;
    }
  }

  /**
   * Fallback: ambil nomor HP user dari userId (uuid) via job_applies.
   * Diambil dari lamaran terbaru user tersebut.
   */
  async getUserPhoneById(userId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `
        SELECT no_hp
        FROM job_applies
        WHERE user_id = $1
          AND no_hp IS NOT NULL
          AND no_hp <> ''
        ORDER BY id DESC
        LIMIT 1
        `,
        [userId]
      );

      const phone = result.rows[0]?.no_hp ?? null;

      if (phone) {
        console.log(
          `[MessageRepository] Phone found for user ${userId}:`,
          phone
        );
      } else {
        console.warn(
          `[MessageRepository] no_hp tidak ditemukan untuk user ${userId}`
        );
      }

      return phone;
    } catch (err) {
      console.error('[MessageRepository] getUserPhoneById error:', err);
      return null;
    }
  }

  // Mendapatkan log WhatsApp terbaru untuk sebuah pesan
  async getWhatsAppLogByMessageId(
    messageId: number
  ): Promise<WhatsAppLog | null> {
    const query = `
      SELECT *
      FROM whatsapp_logs
      WHERE message_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    try {
      const result = await pool.query(query, [messageId]);
      return result.rows[0] || null;
    } catch (err) {
      console.warn(
        '[MessageRepository] getWhatsAppLogByMessageId failed ' +
          '(tabel whatsapp_logs mungkin belum dibuat):',
        err
      );
      return null;
    }
  }
}