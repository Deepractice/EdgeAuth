import type { MailSender, EmailMessage } from './MailSender';

/**
 * MailChannels adapter for sending emails through MailChannels API
 * Free tier: 100 emails per day
 * @see https://support.mailchannels.com/hc/en-us/articles/4565898358413
 */
export class MailChannelSender implements MailSender {
  private readonly apiUrl = 'https://api.mailchannels.net/tx/v1/send';
  private readonly fromEmail: string;
  private readonly fromName?: string;

  /**
   * Create a MailChannels sender
   * @param fromEmail - Sender email address (must be from your domain)
   * @param fromName - Optional sender name
   */
  constructor(fromEmail: string, fromName?: string) {
    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  async send(message: EmailMessage): Promise<void> {
    const payload = {
      personalizations: [
        {
          to: [{ email: message.to }],
        },
      ],
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: message.subject,
      content: [
        {
          type: 'text/html',
          value: message.html,
        },
      ],
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to send email via MailChannels: ${response.status} - ${errorText}`
      );
    }
  }
}
