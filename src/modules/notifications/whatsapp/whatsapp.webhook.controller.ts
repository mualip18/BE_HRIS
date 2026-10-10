
import { Request, Response } from "express";
import { whatsappConfig } from "./whatsapp.config";
import { whatsappService } from "./whatsapp.service";
import {
  IncomingWhatsAppPayload,
  whatsappInboxRepository,
} from "./whatsapp.inbox.repository";

function getPayload(
  body: unknown
): IncomingWhatsAppPayload | null {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return null;
  }

  return body as IncomingWhatsAppPayload;
}

export class WhatsAppWebhookController {
  async receive(req: Request, res: Response): Promise<void> {
    const configuredSecret = whatsappConfig.webhookSecret;
    const suppliedSecret = String(req.query.secret ?? "");

    if (!configuredSecret) {
      res.status(503).json({
        success: false,
        message: "Webhook belum dikonfigurasi.",
      });
      return;
    }

    if (suppliedSecret !== configuredSecret) {
      res.status(401).json({
        success: false,
        message: "Webhook tidak terautorisasi.",
      });
      return;
    }

    const payload = getPayload(req.body);

    if (!payload || !payload.sender) {
      res.status(400).json({
        success: false,
        message: "Payload atau nomor pengirim tidak valid.",
      });
      return;
    }

    try {
      const saved =
        await whatsappInboxRepository.saveIncomingMessage(payload);

      res.status(200).json({
        success: true,
        message: saved
          ? "Pesan WhatsApp berhasil disimpan."
          : "Pesan sudah pernah diterima.",
      });
    } catch (error: unknown) {
      console.error(
        "[WhatsApp Webhook] Gagal menyimpan pesan:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Gagal memproses pesan WhatsApp.",
      });
    }
  }

  async listMessages(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const limit = Number(req.query.limit ?? 50);

      const messages =
        await whatsappInboxRepository.getRecentMessages(limit);

      res.json({
        success: true,
        data: messages,
      });
    } catch (error: unknown) {
      console.error("[WhatsApp] Gagal mengambil pesan:", error);

      res.status(500).json({
        success: false,
        message: "Gagal mengambil pesan WhatsApp.",
      });
    }
  }

  async getConversation(
    req: Request,
    res: Response
  ): Promise<void> {
    const phone = String(req.params.phone ?? "");

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      res.status(400).json({
        success: false,
        message: "Nomor WhatsApp tidak valid.",
      });
      return;
    }

    try {
      const limit = Number(req.query.limit ?? 100);

      const messages =
        await whatsappInboxRepository.getConversation(
          phone,
          limit
        );

      res.json({
        success: true,
        phone: phone.replace(/\D/g, ""),
        data: messages,
      });
    } catch (error: unknown) {
      console.error(
        "[WhatsApp] Gagal mengambil percakapan:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Gagal mengambil percakapan WhatsApp.",
      });
    }
  }

  async reply(
    req: Request,
    res: Response
  ): Promise<void> {
    const phone =
      typeof req.body?.phone === "string"
        ? req.body.phone.trim()
        : "";

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    const inboxId =
      req.body?.inboxId !== undefined &&
      req.body?.inboxId !== null
        ? String(req.body.inboxId).trim()
        : undefined;

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      res.status(400).json({
        success: false,
        message: "Nomor WhatsApp tidak valid.",
      });
      return;
    }

    if (!message) {
      res.status(400).json({
        success: false,
        message: "Isi pesan tidak boleh kosong.",
      });
      return;
    }

    try {
      const gatewayResponse =
        await whatsappService.sendReply(
          phone,
          message,
          inboxId
        );

      const saved =
        await whatsappInboxRepository.saveOutgoingMessage(
          phone,
          message,
          gatewayResponse
        );

      res.status(200).json({
        success: true,
        message: "Permintaan balasan berhasil diproses.",
        data: saved,
      });
    } catch (error: unknown) {
      console.error(
        "[WhatsApp] Gagal mengirim balasan:",
        error
      );

      res.status(502).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengirim balasan WhatsApp.",
      });
    }
  }
}

export const whatsappWebhookController =
  new WhatsAppWebhookController();