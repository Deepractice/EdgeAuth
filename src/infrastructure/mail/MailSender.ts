/**
 * Email message structure for sending emails
 */
export interface EmailMessage {
  /** Recipient email address */
  to: string;
  /** Email subject */
  subject: string;
  /** HTML content of the email */
  html: string;
}

/**
 * Mail sender interface for sending emails
 * Implementations can use different email service providers
 */
export interface MailSender {
  /**
   * Send an email message
   * @param message - The email message to send
   * @throws Error if sending fails
   */
  send(message: EmailMessage): Promise<void>;
}
