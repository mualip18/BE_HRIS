
import { Router } from "express";

import { whatsappWebhookController } from "./whatsapp.webhook.controller";

import {
  authenticate,
} from "../../../core/middlewares/auth.middleware";

import {
  roleMiddleware,
} from "../../../core/middlewares/role.middleware";

import {
  ROLES,
} from "../../../core/constants/roles";

const router = Router();

const adminRoles = [
  ROLES.ADMIN,
  ROLES.REKRUTMEN_ADMIN,
];

// Webhook dari Fonnte: tidak menggunakan login pengguna.
router.post("/webhook", (req, res) => {
  void whatsappWebhookController.receive(req, res);
});

// Endpoint di bawah hanya untuk admin/rekrutmen admin.
router.get(
  "/messages",
  authenticate,
  roleMiddleware(adminRoles),
  (req, res) => {
    void whatsappWebhookController.listMessages(req, res);
  }
);

router.get(
  "/conversation/:phone",
  authenticate,
  roleMiddleware(adminRoles),
  (req, res) => {
    void whatsappWebhookController.getConversation(req, res);
  }
);

router.post(
  "/reply",
  authenticate,
  roleMiddleware(adminRoles),
  (req, res) => {
    void whatsappWebhookController.reply(req, res);
  }
);

export default router;