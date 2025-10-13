import type { EmailMessage, MailSender } from "./MailSender.js";

/**
 * No-op Mail Sender for local development
 *
 * Logs email messages to console instead of sending them
 * Useful for testing without requiring real email service credentials
 */
export class NoMailSender implements MailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log("📧 [NoMailSender] Email would be sent:");
    console.log("  To:", message.to);
    console.log("  Subject:", message.subject);
    console.log("  Body preview:", message.html.substring(0, 100) + "...");

    // Simulate async operation
    await Promise.resolve();
  }
}
