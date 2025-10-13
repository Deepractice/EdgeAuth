# Mail Services Configuration

EdgeAuth supports multiple email sending services through an adapter pattern. Choose the service that best fits your needs.

## Available Services

### 1. Plunk (Recommended) ⭐

**Free Tier:** 3,000 emails/month
**Website:** https://useplunk.com
**Docs:** https://docs.useplunk.com

#### Setup

1. Sign up at https://useplunk.com
2. Get your API key from the dashboard
3. Configure environment variables:

```bash
# .dev.vars or wrangler.toml
PLUNK_API_KEY="sk-xxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_FROM_NAME="EdgeAuth"
```

#### Usage

```typescript
import { PlunkSender } from "edgeauth/core/mail";

const mailSender = new PlunkSender(
  env.PLUNK_API_KEY,
  env.EMAIL_FROM,
  env.EMAIL_FROM_NAME,
);

await mailSender.send({
  to: "user@example.com",
  subject: "Email Verification",
  html: "<h1>Verify your email</h1><p>Click the link below...</p>",
});
```

---

### 2. MailChannels

**Free Tier:** 100 emails/day (requires registration as of 2024)
**Website:** https://mailchannels.com

#### Setup

1. Register at MailChannels
2. Verify your domain
3. Get API key
4. Configure environment variables:

```bash
MAILCHANNELS_API_KEY="xxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_FROM_NAME="EdgeAuth"
```

#### Usage

```typescript
import { MailChannelSender } from "edgeauth/core/mail";

const mailSender = new MailChannelSender(env.EMAIL_FROM, env.EMAIL_FROM_NAME);

await mailSender.send({
  to: "user@example.com",
  subject: "Email Verification",
  html: "<h1>Verify your email</h1>",
});
```

---

### 3. Cloudflare Email Sending (Future)

**Status:** Private Beta
**Free Tier:** TBD

```typescript
import { CloudflareMailSender } from "edgeauth/core/mail";

// Not yet implemented - stub for future use
const mailSender = new CloudflareMailSender(env.EMAIL_BINDING);
```

---

## Service Comparison

| Service          | Free Tier   | Setup Difficulty | Recommended For            |
| ---------------- | ----------- | ---------------- | -------------------------- |
| **Plunk**        | 3,000/month | ⭐ Easy          | Most users                 |
| **MailChannels** | 100/day     | ⭐⭐ Medium      | Cloudflare-specific        |
| **Cloudflare**   | TBD         | ⭐ Easy          | Future (not available yet) |

---

## International Alternatives

### For China-based Users

**Alibaba Cloud DirectMail**

- Free: 2,000 emails/day
- Requires: Domain verification, ICP filing
- Best for: China domestic delivery

**Tencent Cloud SES**

- Free: 1,000 emails (total)
- Price: ¥0.0019/email after free tier
- Best for: Small scale testing

### For Global Users

**Brevo (formerly Sendinblue)**

- Free: 9,000 emails/month (300/day)
- No credit card required
- Best for: Highest free tier

**Resend**

- Free: 3,000 emails/month
- Developer-friendly API
- Best for: Modern development experience

---

## Example: Factory Pattern for Multiple Services

```typescript
// src/core/mail/MailSenderFactory.ts
import { PlunkSender, MailChannelSender } from "edgeauth/core/mail";
import type { MailSender } from "edgeauth/core/mail";

export type MailProvider = "plunk" | "mailchannels" | "cloudflare";

export class MailSenderFactory {
  static create(
    provider: MailProvider,
    config: Record<string, string>,
  ): MailSender {
    switch (provider) {
      case "plunk":
        return new PlunkSender(
          config.PLUNK_API_KEY,
          config.EMAIL_FROM,
          config.EMAIL_FROM_NAME,
        );

      case "mailchannels":
        return new MailChannelSender(config.EMAIL_FROM, config.EMAIL_FROM_NAME);

      default:
        throw new Error(`Unknown mail provider: ${provider}`);
    }
  }
}

// Usage in your worker
const mailSender = MailSenderFactory.create(env.MAIL_PROVIDER as MailProvider, {
  PLUNK_API_KEY: env.PLUNK_API_KEY,
  EMAIL_FROM: env.EMAIL_FROM,
  EMAIL_FROM_NAME: env.EMAIL_FROM_NAME,
});
```

---

## Testing

For development, you can use a mock sender:

```typescript
class MockMailSender implements MailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log("Mock email sent:", message);
  }
}
```

---

## Best Practices

1. **Environment Variables:** Never hardcode API keys
2. **Error Handling:** Always wrap email sending in try-catch
3. **Retry Logic:** Implement retry for transient failures
4. **Rate Limiting:** Respect service rate limits
5. **Templates:** Use HTML templates for consistent styling
6. **Testing:** Test with real emails in staging environment

---

## Troubleshooting

### Common Issues

**Email not received:**

- Check spam folder
- Verify sender domain (SPF, DKIM, DMARC)
- Check service quota limits

**API errors:**

- Verify API key is correct
- Check service status page
- Review error message details

**Slow sending:**

- Consider async/queue for bulk emails
- Check network latency
- Use service with closer data center

---

## Migration Guide

When switching services, update:

1. Environment variables
2. MailSender instantiation
3. Test thoroughly in staging
4. Monitor error rates after deployment

Example:

```typescript
// Before (MailChannels)
const sender = new MailChannelSender(from, name);

// After (Plunk)
const sender = new PlunkSender(apiKey, from, name);
```
