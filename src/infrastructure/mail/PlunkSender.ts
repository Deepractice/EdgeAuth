import type { EmailMessage, MailSender } from "./MailSender.js";

/**
 * Plunk email sender implementation
 *
 * Uses Plunk's cloud service (useplunk.com) to send emails
 * Free tier: 3,000 emails/month
 *
 * @see https://docs.useplunk.com/api-reference/transactional/send
 */
export class PlunkSender implements MailSender {
  private readonly apiKey: string;
  private readonly apiUrl = "https://api.useplunk.com/v1/send";
  private readonly fromEmail?: string;
  private readonly fromName?: string;

  /**
   * Create a new Plunk sender
   *
   * @param apiKey - Plunk API key (get from https://useplunk.com)
   * @param fromEmail - Optional sender email address. If not provided, uses Plunk's default verified email
   * @param fromName - Optional sender name
   */
  constructor(apiKey: string, fromEmail?: string, fromName?: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  async send(message: EmailMessage): Promise<void> {
    const payload = {
      to: message.to,
      subject: message.subject,
      body: message.html,
      ...(this.fromEmail && { from: this.fromEmail }),
      ...(this.fromName && { name: this.fromName }),
    };

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to send email via Plunk: ${response.status} - ${errorText}`,
      );
    }

    const result = (await response.json()) as { success: boolean };

    if (!result.success) {
      throw new Error("Plunk API returned success: false");
    }
  }
}
