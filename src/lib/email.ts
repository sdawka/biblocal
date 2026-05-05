import { createMimeMessage } from 'mimetext';
import { EmailMessage } from 'cloudflare:email';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(
  emailBinding: SendEmail,
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const msg = createMimeMessage();
    const fromAddr = options.from || 'auth@biblocal.app';

    msg.setSender({ name: 'biblocal', addr: fromAddr });
    msg.setRecipient(options.to);
    msg.setSubject(options.subject);
    msg.addMessage({
      contentType: 'text/html',
      data: options.html,
    });

    const message = new EmailMessage(fromAddr, options.to, msg.asRaw());
    await emailBinding.send(message);

    return { success: true };
  } catch (e) {
    console.error('Email send error:', e);
    return { success: false, error: String(e) };
  }
}

export function loginCodeEmail(code: string): { subject: string; html: string } {
  return {
    subject: `Your biblocal login code: ${code}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; background: #F5E6D3; padding: 40px; }
    .card { max-width: 400px; margin: 0 auto; background: #FDF5E6; border: 1px solid #E8D4A8; border-radius: 8px; padding: 32px; }
    h1 { font-family: 'Playfair Display', Georgia, serif; color: #722F37; font-size: 24px; margin: 0 0 16px; }
    .code { font-size: 32px; letter-spacing: 4px; color: #2C1810; font-weight: bold; background: #FAF6F0; padding: 16px 24px; border-radius: 4px; text-align: center; margin: 24px 0; border: 1px solid #E8D4A8; }
    p { color: #6B5B4F; line-height: 1.6; margin: 0 0 16px; }
    .footer { font-size: 14px; color: #8B7B6F; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E8D4A8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to biblocal</h1>
    <p>Enter this code to sign in to your account:</p>
    <div class="code">${code}</div>
    <p>This code expires in 10 minutes.</p>
    <div class="footer">
      If you didn't request this code, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}
