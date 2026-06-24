const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

function getFrontendUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  const origin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  return origin.replace(/\/$/, '');
}

function getEmailLogoUrl() {
  if (process.env.EMAIL_LOGO_URL?.trim()) {
    return process.env.EMAIL_LOGO_URL.trim();
  }
  return `${getFrontendUrl()}/taskora-email-logo.png`;
}

function getEmailLogoSrc() {
  try {
    const logoPath = path.join(__dirname, '../assets/taskora-email-logo.png');
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return getEmailLogoUrl();
  }
}

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getFromAddress() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;

  const sandboxFrom = process.env.RESEND_SANDBOX_FROM?.trim();
  if (sandboxFrom) return sandboxFrom;

  return 'Taskora <onboarding@resend.dev>';
}

function getEmailStatus() {
  const from = getFromAddress();
  return {
    configured: isEmailConfigured(),
    fromAddress: from,
    usingSandboxFrom: from.includes('@resend.dev'),
    frontendUrl: getFrontendUrl(),
    logoSource: getEmailLogoSrc().startsWith('data:') ? 'embedded' : 'url',
  };
}

function renderEmailLayout({ greeting, paragraphs, credentials, ctaLabel, ctaUrl, footnotes = [] }) {
  const logoUrl = escapeHtml(getEmailLogoSrc());
  const safeGreeting = escapeHtml(greeting);
  const bodyHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#374151;">${paragraph}</p>`
    )
    .join('');

  const credentialsHtml = credentials
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;">
            <p style="margin:0 0 10px;font-size:14px;line-height:22px;color:#111827;"><strong>Email:</strong> ${credentials.email}</p>
            <p style="margin:0;font-size:14px;line-height:22px;color:#111827;"><strong>Temporary password:</strong> ${credentials.password}</p>
          </td>
        </tr>
      </table>
    `
    : '';

  const ctaHtml = ctaLabel && ctaUrl
    ? `
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#fd7b41;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:14px 24px;border-radius:10px;">
          ${escapeHtml(ctaLabel)}
        </a>
      </p>
    `
    : '';

  const footnotesHtml = footnotes
    .map(
      (note) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:22px;color:#6b7280;">${note}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
            <tr>
              <td style="padding:36px 32px 28px;">
                <img src="${logoUrl}" alt="Taskora" width="52" height="52" style="display:block;width:52px;height:52px;margin:0 0 28px;border-radius:14px;" />
                <p style="margin:0 0 18px;font-size:16px;line-height:24px;color:#111827;">${safeGreeting}</p>
                ${bodyHtml}
                ${credentialsHtml}
                ${ctaHtml}
                ${footnotesHtml}
                <p style="margin:24px 0 0;font-size:15px;line-height:24px;color:#111827;">Happy working!</p>
                <p style="margin:8px 0 0;font-size:15px;line-height:24px;color:#111827;"><strong>Taskora Team</strong></p>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:20px auto 0;font-size:12px;line-height:18px;color:#9ca3af;text-align:center;">
            Taskora Pro Workspace<br />
            This message was sent because an account action was requested for your workspace.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendWelcomeEmail(toEmail, fullName, temporaryPassword) {
  const client = getClient();

  if (!isEmailConfigured() || !client) {
    throw new Error('Resend not configured. Set RESEND_API_KEY and EMAIL_FROM on the server.');
  }

  const loginUrl = `${getFrontendUrl()}/login`;
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(toEmail);
  const safePassword = escapeHtml(temporaryPassword);

  const html = renderEmailLayout({
    greeting: `Hi ${safeName},`,
    paragraphs: [
      'Your administrator created a Taskora account for you.',
      'Use the sign-in details below to access your workspace. You will be asked to choose a new password on your first login.',
    ],
    credentials: {
      email: safeEmail,
      password: safePassword,
    },
    ctaLabel: 'Sign in to Taskora',
    ctaUrl: loginUrl,
    footnotes: [
      'Keep this email private. Your temporary password should only be used once to sign in.',
    ],
  });

  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: [toEmail.trim()],
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    subject: 'Welcome to Taskora — your account details',
    html,
    text: [
      `Hi ${fullName},`,
      'Your administrator created a Taskora account for you.',
      `Email: ${toEmail}`,
      `Temporary password: ${temporaryPassword}`,
      `Sign in: ${loginUrl}`,
      'You must change your password on first login.',
    ].join('\n'),
  });

  if (error) {
    const detail = error.message || 'Failed to send welcome email';
    if (/only send.*yourself|testing emails|verify a domain|not authorized/i.test(detail)) {
      throw new Error(
        `${detail} Add and verify vendra.best in Resend, or verify this recipient email in Resend.`
      );
    }
    throw new Error(detail);
  }

  return data;
}

async function sendForgotPasswordEmail(toEmail, fullName, temporaryPassword) {
  const client = getClient();

  if (!isEmailConfigured() || !client) {
    throw new Error('Resend not configured. Set RESEND_API_KEY and EMAIL_FROM on the server.');
  }

  const loginUrl = `${getFrontendUrl()}/login`;
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(toEmail);
  const safePassword = escapeHtml(temporaryPassword);

  const html = renderEmailLayout({
    greeting: `Hi ${safeName},`,
    paragraphs: [
      'We received a request to reset your Taskora password.',
      'Use the temporary password below to sign in. After signing in, you will be asked to choose a new password right away.',
    ],
    credentials: {
      email: safeEmail,
      password: safePassword,
    },
    ctaLabel: 'Sign in to Taskora',
    ctaUrl: loginUrl,
    footnotes: [
      'If you did not request this reset, contact your administrator.',
      'For your security, this temporary password replaces your previous one.',
    ],
  });

  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: [toEmail.trim()],
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    subject: 'Taskora — your temporary password',
    html,
    text: [
      `Hi ${fullName},`,
      'We received a request to reset your Taskora password.',
      `Email: ${toEmail}`,
      `Temporary password: ${temporaryPassword}`,
      `Sign in: ${loginUrl}`,
      'After signing in, you will be asked to choose a new password.',
      'If you did not request this, contact your administrator.',
    ].join('\n'),
  });

  if (error) {
    const detail = error.message || 'Failed to send password reset email';
    if (/only send.*yourself|testing emails|verify a domain|not authorized/i.test(detail)) {
      throw new Error(
        `${detail} Add and verify vendra.best in Resend, or verify this recipient email in Resend.`
      );
    }
    throw new Error(detail);
  }

  return data;
}

module.exports = sendWelcomeEmail;
module.exports.isEmailConfigured = isEmailConfigured;
module.exports.getEmailStatus = getEmailStatus;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
module.exports.sendForgotPasswordEmail = sendForgotPasswordEmail;
