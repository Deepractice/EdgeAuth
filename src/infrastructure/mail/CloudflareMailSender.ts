import type { MailSender, EmailMessage } from './MailSender';

/**
 * Cloudflare Email Sending adapter (Future implementation)
 * Will be available when Cloudflare Email Sending is out of private beta
 * @see https://blog.cloudflare.com/email-service/
 */
export class CloudflareMailSender implements MailSender {
  /**
   * Create a Cloudflare Email sender
   * @param _emailBinding - Cloudflare Email binding from env
   */
  constructor(private readonly _emailBinding: any) {}

  async send(_message: EmailMessage): Promise<void> {
    // TODO: Implement when Cloudflare Email Sending is available
    // Expected usage:
    // await this.emailBinding.send({
    //   to: message.to,
    //   subject: message.subject,
    //   html: message.html,
    // });
    throw new Error(
      'CloudflareMailSender is not yet implemented. Cloudflare Email Sending is currently in private beta.'
    );
  }
}
