import { Router, Request, Response, NextFunction } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// GET PESAN USER
router.get(
  '/',
  (req: Request, res: Response, next: NextFunction) =>
    messageController.getMyMessages(req, res, next)
);

// CEK STATUS WHATSAPP UNTUK PESAN
// (admin only — guard role silakan tambahkan sesuai pola Anda)
router.get(
  '/:messageId/whatsapp-status',
  (req: Request, res: Response, next: NextFunction) =>
    messageController.getWhatsAppStatus(req, res, next)
);

// READ MESSAGE
router.patch(
  '/:id/read',
  (req: Request, res: Response, next: NextFunction) =>
    messageController.markRead(req, res, next)
);

// SEND MESSAGE
router.post(
  '/:id/send-message',
  (req: Request, res: Response, next: NextFunction) =>
    messageController.sendMessage(req, res, next)
);

// SEND TEST
router.post(
  '/:id/send-test',
  (req: Request, res: Response, next: NextFunction) =>
    messageController.sendTestMessage(req, res, next)
);

// APPLY MESSAGE
router.get(
  '/apply/:id',
  (req: Request, res: Response, next: NextFunction) =>
    messageController.getMessagesByApply(req, res, next)
);

export default router;