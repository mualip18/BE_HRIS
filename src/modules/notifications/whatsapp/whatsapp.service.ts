
import axios from "axios";
import { whatsappConfig } from "./whatsapp.config";
import { WhatsAppRepository } from "./whatsapp.repository";

type WhatsAppGatewayResponse = {
  status?: boolean;
  Status?: boolean;
  reason?: string;
  message?: string;
  requestid?: string | number;
  [key: string]: unknown;
};

export class WhatsAppService {
  private repo = new WhatsAppRepository();

  private isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    } else if (!cleaned.startsWith("62")) {
      cleaned = "62" + cleaned;
    }

    return cleaned;
  }

  private async callGateway(
    phone: string,
    message: string,
    inboxId?: string
  ): Promise<WhatsAppGatewayResponse> {
    if (!whatsappConfig.enabled) {
      throw new Error("WhatsApp dinonaktifkan melalui WHATSAPP_ENABLED.");
    }

    if (!whatsappConfig.apiKey) {
      throw new Error("WHATSAPP_GATEWAY_API_KEY belum diatur.");
    }

    if (!phone || !this.isValidPhone(phone)) {
      throw new Error("Nomor WhatsApp tidak valid.");
    }

    if (!message.trim()) {
      throw new Error("Isi pesan WhatsApp tidak boleh kosong.");
    }

    const target = this.normalizePhone(phone);

    const payload: Record<string, string> = {
      target,
      message,
    };

    if (inboxId) {
      payload.inboxid = inboxId;
    }

    const response = await axios.post<WhatsAppGatewayResponse>(
      whatsappConfig.gatewayUrl,
      payload,
      {
        headers: {
          Authorization: whatsappConfig.apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const data = response.data;

    if (data?.status === false || data?.Status === false) {
      throw new Error(
        data.reason ||
          data.message ||
          "Fonnte menolak pengiriman pesan."
      );
    }

    return data;
  }

  async sendMessage(
    phone: string,
    message: string,
    messageId?: number
  ): Promise<void> {
    if (!whatsappConfig.enabled) {
      console.log("[WhatsApp] Pengiriman dinonaktifkan.");
      return;
    }

    let logId: number | null = null;
    let normalizedPhone = phone || "unknown";

    try {
      if (!phone || !this.isValidPhone(phone)) {
        throw new Error("Nomor WhatsApp tidak valid.");
      }

      normalizedPhone = this.normalizePhone(phone);

      const log = await this.repo.createLog(
        messageId ?? null,
        normalizedPhone,
        "PENDING"
      );

      logId = log.id;

      await this.callGateway(normalizedPhone, message);

      await this.repo.updateLogStatus(logId, "SENT");

      console.log(
        `[WhatsApp] Permintaan pengiriman diterima untuk ${normalizedPhone}`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Kesalahan pengiriman WhatsApp.";

      console.error("[WhatsApp] Pengiriman gagal:", errorMessage);

      try {
        if (logId !== null) {
          await this.repo.updateLogStatus(
            logId,
            "FAILED",
            errorMessage
          );
        } else if (messageId !== undefined) {
          await this.repo.createLog(
            messageId,
            normalizedPhone,
            "FAILED",
            errorMessage
          );
        }
      } catch (logError) {
        console.error(
          "[WhatsApp] Gagal mencatat log pengiriman:",
          logError
        );
      }

      // Tidak melempar ulang agar perilaku lama MessageService
      // tetap dipertahankan.
    }
  }

  async sendReply(
    phone: string,
    message: string,
    inboxId?: string
  ): Promise<WhatsAppGatewayResponse> {
    return this.callGateway(phone, message, inboxId);
  }
}

export const whatsappService = new WhatsAppService();