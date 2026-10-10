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

export interface SendWhatsAppPayload {
  phone: string;
  message: string;
}