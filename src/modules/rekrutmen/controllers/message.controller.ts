import { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';

export class MessageController {
  private messageService = new MessageService();

  // Admin: kirim pesan biasa
  async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const senderId = (req as any).user?.id;

      if (!senderId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const applyId = parseInt(req.params.id);
      const { subject, body, notify_whatsapp } = req.body;

      if (!subject || !body) {
        return res.status(400).json({
          success: false,
          message: 'Subject dan body harus diisi',
        });
      }

      // Default: kirim notifikasi WA kecuali eksplisit false
      const notifyWhatsapp = notify_whatsapp !== false;

      const message = await this.messageService.sendMessage(
        applyId,
        senderId,
        subject,
        body,
        notifyWhatsapp
      );

      return res.status(201).json({
        success: true,
        message: 'Pesan berhasil dikirim',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: kirim pesan + assign test
  async sendTestMessage(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const senderId = (req as any).user?.id;

      if (!senderId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const applyId = parseInt(req.params.id);
      const { subject, body, test_id, notify_whatsapp } = req.body;

      if (!subject || !body || !test_id) {
        return res.status(400).json({
          success: false,
          message: 'Subject, body, dan test_id harus diisi',
        });
      }

      const notifyWhatsapp = notify_whatsapp !== false;

      const result = await this.messageService.sendTestMessage(
        applyId,
        senderId,
        subject,
        body,
        test_id,
        notifyWhatsapp
      );

      return res.status(201).json({
        success: true,
        message: 'Pesan dan test berhasil dikirim',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: lihat pesan berdasarkan lamaran
  async getMessagesByApply(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const applyId = parseInt(req.params.id);

      const messages =
        await this.messageService.getMessagesForApply(applyId);

      return res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  // Kandidat: lihat pesan saya
  async getMyMessages(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log("=== GET MY MESSAGE ===");
      console.log("PARAM:", req.params);
      console.log("USER:", (req as any).user);

      const userId = (req as any).user?.id;

      console.log("USER ID UNTUK QUERY:", userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const messages =
        await this.messageService.getMessagesForUser(userId);

      return res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  // Tandai pesan sudah dibaca
  async markRead(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const messageId = String(req.params.id);

      console.log("MARK READ ID:", messageId);

      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: "ID tidak valid",
        });
      }

      await this.messageService.markMessageAsRead(messageId);

      return res.json({
        success: true,
        message: "Pesan ditandai sudah dibaca",
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin: cek status WhatsApp untuk sebuah pesan
  async getWhatsAppStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const messageId = parseInt(req.params.messageId);

      if (!messageId || isNaN(messageId)) {
        return res.status(400).json({
          success: false,
          message: 'messageId tidak valid',
        });
      }

      const status =
        await this.messageService.getWhatsAppStatus(messageId);

      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const messageController = new MessageController();