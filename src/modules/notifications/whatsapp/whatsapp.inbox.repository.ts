
import pool from "../../../config/db";

export interface WhatsAppInboxMessage {
  id: string;
  direction: "IN" | "OUT";
  provider_inbox_id: string | null;
  sender_phone: string;
  sender_name: string | null;
  message_text: string | null;
  attachment_url: string | null;
  attachment_filename: string | null;
  received_at: Date;
  raw_payload: Record<string, unknown>;
  created_at: Date;
}

export interface IncomingWhatsAppPayload {
  inboxid?: string | number;
  sender?: string;
  name?: string;
  message?: string;
  url?: string;
  filename?: string;
  timestamp?: string | number;
  [key: string]: unknown;
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }

  return cleaned;
}

export class WhatsAppInboxRepository {
  async saveIncomingMessage(
    payload: IncomingWhatsAppPayload
  ): Promise<WhatsAppInboxMessage | null> {
    const providerInboxId =
      payload.inboxid !== undefined &&
      payload.inboxid !== null &&
      String(payload.inboxid).trim() !== ""
        ? String(payload.inboxid)
        : null;

    const sender = String(payload.sender ?? "").trim();

    if (!sender) {
      throw new Error("Nomor pengirim tidak ditemukan.");
    }

    const senderPhone = normalizePhone(sender);

    const senderName = payload.name
      ? String(payload.name).slice(0, 255)
      : null;

    const messageText =
      payload.message !== undefined && payload.message !== null
        ? String(payload.message)
        : null;

    const attachmentUrl = payload.url
      ? String(payload.url)
      : null;

    const attachmentFilename = payload.filename
      ? String(payload.filename).slice(0, 255)
      : null;

    let receivedAt = new Date();

    if (payload.timestamp !== undefined) {
      const parsedTimestamp = new Date(
        typeof payload.timestamp === "number" &&
        payload.timestamp < 1000000000000
          ? payload.timestamp * 1000
          : payload.timestamp
      );

      if (!Number.isNaN(parsedTimestamp.getTime())) {
        receivedAt = parsedTimestamp;
      }
    }

    const result = await pool.query(
      `
        INSERT INTO whatsapp_inbox_messages (
          direction,
          provider_inbox_id,
          sender_phone,
          sender_name,
          message_text,
          attachment_url,
          attachment_filename,
          received_at,
          raw_payload
        )
        VALUES (
          'IN', $1, $2, $3, $4, $5, $6, $7, $8::jsonb
        )
        ON CONFLICT (provider_inbox_id) DO NOTHING
        RETURNING *
      `,
      [
        providerInboxId,
        senderPhone,
        senderName,
        messageText,
        attachmentUrl,
        attachmentFilename,
        receivedAt,
        JSON.stringify(payload),
      ]
    );

    return result.rows[0] ?? null;
  }

  async saveOutgoingMessage(
    phone: string,
    message: string,
    gatewayResponse: Record<string, unknown>
  ): Promise<WhatsAppInboxMessage> {
    const normalizedPhone = normalizePhone(phone);

    const result = await pool.query(
      `
        INSERT INTO whatsapp_inbox_messages (
          direction,
          sender_phone,
          sender_name,
          message_text,
          received_at,
          raw_payload
        )
        VALUES ('OUT', $1, NULL, $2, NOW(), $3::jsonb)
        RETURNING *
      `,
      [
        normalizedPhone,
        message,
        JSON.stringify({
          gateway_response: gatewayResponse,
        }),
      ]
    );

    return result.rows[0];
  }

  async getRecentMessages(
    limit = 50
  ): Promise<WhatsAppInboxMessage[]> {
    const safeLimit = Math.min(
      Math.max(Math.trunc(limit) || 50, 1),
      200
    );

    const result = await pool.query(
      `
        SELECT *
        FROM whatsapp_inbox_messages
        ORDER BY received_at DESC, id DESC
        LIMIT $1
      `,
      [safeLimit]
    );

    return result.rows;
  }

  async getConversation(
    phone: string,
    limit = 100
  ): Promise<WhatsAppInboxMessage[]> {
    const safeLimit = Math.min(
      Math.max(Math.trunc(limit) || 100, 1),
      200
    );

    const normalizedPhone = normalizePhone(phone);

    const result = await pool.query(
      `
        SELECT *
        FROM whatsapp_inbox_messages
        WHERE sender_phone = $1
        ORDER BY received_at ASC, id ASC
        LIMIT $2
      `,
      [normalizedPhone, safeLimit]
    );

    return result.rows;
  }
}

export const whatsappInboxRepository =
  new WhatsAppInboxRepository();