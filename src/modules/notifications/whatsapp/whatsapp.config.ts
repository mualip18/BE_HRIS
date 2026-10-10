
import dotenv from "dotenv";

dotenv.config();

export const whatsappConfig = {
  enabled: process.env.WHATSAPP_ENABLED === "true",

  gatewayUrl:
    process.env.WHATSAPP_GATEWAY_URL ||
    "https://api.fonnte.com/send",

  apiKey: process.env.WHATSAPP_GATEWAY_API_KEY || "",

  webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || "",
};