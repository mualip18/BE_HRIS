import { MessageRepository } from '../repositories/message.repository';
import pool from '../../../config/db';
import { whatsappService } from '../../notifications/whatsapp/whatsapp.service';

export class MessageService {
  private messageRepo = new MessageRepository();

  /**
   * Admin kirim pesan biasa (opsional: kirim notifikasi WhatsApp)
   */
  async sendMessage(
    applyId: number,
    senderId: string,
    subject: string,
    body: string,
    notifyWhatsapp: boolean = true
  ) {
    const receiverId = await this.messageRepo.getUserIdByApplyId(applyId);

    console.log('SEND MESSAGE DEBUG', {
      applyId,
      senderId,
      receiverId,
      notifyWhatsapp,
    });

    if (!receiverId) {
      throw new Error('Lamaran tidak ditemukan');
    }

    const message = await this.messageRepo.createMessage(
      applyId,
      senderId,
      receiverId,
      subject,
      body
    );

    let whatsappStatus: 'PENDING' | 'SENT' | 'FAILED' | 'NOT_SENT' =
      'NOT_SENT';

    if (notifyWhatsapp) {
      this.sendWhatsAppNotification(
        receiverId,
        subject,
        body,
        message.id
      ).catch((err) => {
        console.error('[WhatsApp] sendMessage notification error:', err);
      });
      whatsappStatus = 'PENDING';
    }

    return {
      ...message,
      whatsapp_status: whatsappStatus,
    };
  }

  /**
   * Helper kirim notifikasi WhatsApp.
   * - Untuk pesan biasa: kirim subjek + isi pesan.
   * - Untuk pesan + test: sertakan juga link pengerjaan tes.
   */
  private async sendWhatsAppNotification(
    receiverId: string,
    subject: string,
    body: string,
    messageId: number,
    testUrl?: string
  ): Promise<void> {
    try {
      const phone = await this.messageRepo.getUserPhoneById(receiverId);
      if (!phone) {
        console.warn(`[WhatsApp] No phone number for user ${receiverId}`);
        return;
      }

      let notif =
        `Assalamualaikum,\n\n` +
        `Anda menerima pesan baru dari tim Rekrutmen.\n\n` +
        `Subjek: *${subject}*\n\n` +
        `Isi Pesan:\n${body}\n\n`;

      if (testUrl) {
        notif +=
          `Silakan kerjakan tes Anda melalui link berikut:\n` +
          `${testUrl}\n\n`;
      }

      notif +=
        `Silakan buka aplikasi Human Resource Information System untuk melihat detail pesan.\n\n` +
        `Terima kasih.`;

      await whatsappService.sendMessage(phone, notif, messageId);
    } catch (error) {
      console.error('[WhatsApp] Error in sendWhatsAppNotification:', error);
    }
  }

  /**
   * Buat slug dari nama materi tes.
   * Contoh: "Tes Logika & Numerik" -> "tes-logika-numerik"
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Admin kirim pesan + assign test
   */
  async sendTestMessage(
    applyId: number,
    senderId: string,
    subject: string,
    body: string,
    testId: string,
    notifyWhatsapp: boolean = true
  ) {
    const receiverId = await this.messageRepo.getUserIdByApplyId(applyId);

    if (!receiverId) {
      throw new Error('Lamaran tidak ditemukan');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      console.log('========== SEND TEST ==========');
      console.log('Candidate :', receiverId);
      console.log('Test      :', testId);
      console.log('Sender    :', senderId);
      console.log('Notify WA :', notifyWhatsapp);

      /**
       * 1. Simpan pesan
       */
      const msgResult = await client.query(
        `
        INSERT INTO messages
        (
          apply_id,
          sender_id,
          receiver_id,
          subject,
          body
        )
        VALUES
        (
          $1,$2,$3,$4,$5
        )
        RETURNING *
        `,
        [applyId, senderId, receiverId, subject, body]
      );

      const message = msgResult.rows[0];

      /**
       * 2. Ambil nama materi tes dari tabel tests
       *    ⚠️ Ganti 'title' jika kolomnya beda (mis. 'name', 'judul', 'nama')
       */
      const testResult = await client.query(
        `
        SELECT title
        FROM tests
        WHERE id = $1
        LIMIT 1
        `,
        [testId]
      );

      const testTitle: string | null = testResult.rows[0]?.title ?? null;

      /**
       * 3. Cek apakah assignment sudah ada
       */
      const existing = await client.query(
        `
        SELECT *
        FROM candidate_tests
        WHERE candidate_id=$1
        AND test_id=$2
        LIMIT 1
        `,
        [receiverId, testId]
      );

      let assignment;

      if (existing.rows.length > 0) {
        console.log('Assignment sudah ada.');

        const update = await client.query(
          `
          UPDATE candidate_tests
          SET
            assigned_by = $1,
            assigned_at = NOW(),
            status = 'assigned'
          WHERE id = $2
          RETURNING *
          `,
          [senderId, existing.rows[0].id]
        );

        assignment = update.rows[0];
      } else {
        console.log('Membuat assignment baru.');

        const insert = await client.query(
          `
          INSERT INTO candidate_tests
          (
            candidate_id,
            test_id,
            assigned_by,
            assigned_at,
            status
          )
          VALUES
          (
            $1,
            $2,
            $3,
            NOW(),
            'assigned'
          )
          RETURNING *
          `,
          [receiverId, testId, senderId]
        );

        assignment = insert.rows[0];
      }

      console.log('ASSIGNMENT:', assignment);
      console.log('TEST TITLE :', testTitle);

      await client.query('COMMIT');

      let whatsappStatus: 'PENDING' | 'SENT' | 'FAILED' | 'NOT_SENT' =
        'NOT_SENT';

      if (notifyWhatsapp) {
        /**
         * Link tes pakai NAMA MATERI (slug), bukan ID.
         * Contoh: https://human-resource-information-system.com/test/matematika
         */
        const testSlug = testTitle ? this.slugify(testTitle) : String(testId);
        const testUrl = `https://human-resource-information-system.com/test/${testSlug}`;

        this.sendWhatsAppNotification(
          receiverId,
          subject,
          body,
          message.id,
          testUrl
        ).catch((err) => {
          console.error('[WhatsApp] sendTestMessage notification error:', err);
        });
        whatsappStatus = 'PENDING';
      }

      return {
        message: {
          ...message,
          whatsapp_status: whatsappStatus,
        },
        assignment,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('SEND TEST ERROR');
      console.error(error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Admin lihat pesan berdasarkan lamaran
   * (termasuk status WA jika ada)
   */
  async getMessagesForApply(applyId: number) {
    const messages = await this.messageRepo.getMessagesByApplyId(applyId);

    const messagesWithWa = await Promise.all(
      messages.map(async (msg) => {
        try {
          const waLog = await this.messageRepo.getWhatsAppLogByMessageId(
            msg.id
          );
          return {
            ...msg,
            whatsapp_status: waLog ? waLog.status : null,
            whatsapp_attempts: waLog ? waLog.attempts : 0,
            whatsapp_error: waLog ? waLog.error_message : null,
          };
        } catch (e) {
          return {
            ...msg,
            whatsapp_status: null,
            whatsapp_attempts: 0,
            whatsapp_error: null,
          };
        }
      })
    );

    return messagesWithWa;
  }

  /**
   * Kandidat lihat pesan miliknya
   */
  async getMessagesForUser(userId: string) {
    return this.messageRepo.getMessagesByUserId(userId);
  }

  /**
   * Tandai pesan dibaca
   */
  async markMessageAsRead(messageId: string) {
    return this.messageRepo.markAsRead(messageId);
  }

  /**
   * Ambil status pengiriman WhatsApp untuk sebuah pesan
   */
  async getWhatsAppStatus(messageId: number) {
    const log = await this.messageRepo.getWhatsAppLogByMessageId(messageId);
    if (!log) {
      return {
        status: 'NOT_SENT',
        attempts: 0,
        error_message: null,
        last_attempt_at: null,
      };
    }
    return {
      status: log.status,
      attempts: log.attempts,
      error_message: log.error_message,
      last_attempt_at: log.last_attempt_at,
    };
  }
}