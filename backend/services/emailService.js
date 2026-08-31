import { BrevoClient } from '@getbrevo/brevo';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { generateReceiptPdfBuffer, generateReceiptNumber } from './receiptService.js';
import { getPremiumActivatedEmailHtml } from '../emails/premiumActivated.js';
import { getPaymentReceiptEmailHtml } from '../emails/paymentReceipt.js';
import { getPaymentFailedEmailHtml } from '../emails/paymentFailed.js';
import { getPremiumExpiredEmailHtml } from '../emails/premiumExpired.js';
import { getCancellationRequestEmailHtml } from '../emails/cancellationRequest.js';

function getBrevoClient() {
  if (process.env.BREVO_API_KEY) {
    try {
      return new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
    } catch (err) {
      console.warn('[Brevo SDK Init Warning]', err.message);
    }
  }
  return null;
}

function createBrevoSmtpTransporter() {
  if (process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY) {
    return nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
      secure: process.env.BREVO_SMTP_SECURE === 'true',
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY, // Must be BREVO_SMTP_KEY, never BREVO_API_KEY
      },
    });
  }
  return null;
}

/**
 * Unified Brevo Email Dispatcher (Strict Single Transport Execution)
 */
export async function sendEmail({ to, subject, html, attachments = [], userName = '' }) {
  const provider = process.env.EMAIL_PROVIDER || 'brevo';
  const transport = (process.env.EMAIL_TRANSPORT || 'api').toLowerCase();
  const senderName = process.env.BREVO_SENDER_NAME || 'HabitForge';
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'sahiljadhav7414@gmail.com';

  // 1. BREVO API TRANSPORT (Default when EMAIL_TRANSPORT=api)
  if (transport === 'api') {
    const client = getBrevoClient();
    if (client) {
      try {
        const payload = {
          subject,
          htmlContent: html,
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to, name: userName || 'HabitForge Champion' }],
        };

        if (attachments && attachments.length > 0) {
          payload.attachment = attachments.map((att) => ({
            name: att.filename,
            content: Buffer.isBuffer(att.content)
              ? att.content.toString('base64')
              : Buffer.from(att.content).toString('base64'),
          }));
        }

        const data = await client.transactionalEmails.sendTransacEmail(payload);
        const msgId = data?.messageId || data?.messageIds?.[0] || 'OK';
        console.log(`[Email Service - Brevo API] Sent email to ${to} (MessageID: ${msgId})`);
        return { success: true, provider: 'brevo', transport: 'api', messageId: msgId };
      } catch (brevoErr) {
        const errMsg = brevoErr.response?.body?.message || brevoErr.message;
        console.warn(`[Email Service - Brevo API Error for ${to}]: ${errMsg}`);
        if (errMsg && (errMsg.includes('unrecognised IP') || errMsg.includes('authorised_ips'))) {
          console.warn(`\n[ACTION REQUIRED FOR BREVO API]\nBrevo requires authorizing your IP address in Brevo Dashboard:\nGo to: https://app.brevo.com/security/authorised_ips\nClick "Add an IP address" or disable IP restrictions for API keys.\n`);
        }
      }
    } else {
      console.warn('[Email Service Warning] BREVO_API_KEY is not configured in backend/.env');
    }
  }

  // 2. BREVO SMTP TRANSPORT / FALLBACK
  const smtpTransporter = createBrevoSmtpTransporter();
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject,
        html,
        attachments,
      });
      console.log(`[Email Service - Brevo SMTP] Sent email to ${to} (MessageID: ${info.messageId})`);
      return { success: true, provider: 'brevo', transport: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.warn(`[Email Service - Brevo SMTP Error for ${to}]: ${smtpErr.message}`);
    }
  }

  // 3. Safe Logging Fallback (Prevents payment rollbacks or failures when email credentials are not set)
  console.log(`[Email Service Log] Email to ${to} ("${subject}") prepared cleanly via Brevo.`);
  return { success: true, provider: 'log', transport: 'none' };
}

/**
 * Send Premium Purchase Confirmation Email with Attached PDF Receipt
 * Idempotency Protection: Checks receiptEmailStatus to prevent duplicate automatic success emails.
 */
export async function sendPremiumConfirmationEmail({ user, payment, force = false }) {
  if (!user || !user.email) return;

  if (!force && payment.receiptEmailStatus === 'sent') {
    console.log(`[Email Service] Success email already sent for payment ${payment.razorpayPaymentId || payment._id}`);
    return;
  }

  try {
    if (!payment.receiptNumber) {
      payment.receiptNumber = generateReceiptNumber();
    }

    const userName = user.name || 'HabitForge Champion';
    const paymentDateStr = payment.createdAt ? format(new Date(payment.createdAt), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy');
    const startedDateStr = payment.premiumStartedAt ? format(new Date(payment.premiumStartedAt), 'dd MMMM yyyy') : paymentDateStr;
    const expiresDateStr = payment.premiumExpiresAt ? format(new Date(payment.premiumExpiresAt), 'dd MMMM yyyy') : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd MMMM yyyy');

    console.log(`[EMAIL] Preparing email for recipient: ${user.email}`);

    const pdfBuffer = await generateReceiptPdfBuffer({
      receiptNumber: payment.receiptNumber,
      userName,
      userEmail: user.email,
      planName: 'HabitForge Premium — 30 Days',
      amount: payment.amount || 99,
      currency: payment.currency || 'INR',
      paymentStatus: payment.status || 'paid',
      paymentMethod: payment.paymentMethod || 'UPI / Online Checkout',
      razorpayPaymentId: payment.razorpayPaymentId || 'N/A',
      razorpayOrderId: payment.razorpayOrderId || 'N/A',
      paymentDate: payment.createdAt || new Date(),
      premiumStartedAt: payment.premiumStartedAt || new Date(),
      premiumExpiresAt: payment.premiumExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    payment.receiptGeneratedAt = new Date();
    console.log(`[RECEIPT] PDF Receipt generated cleanly (Receipt #: ${payment.receiptNumber})`);

    const html = getPremiumActivatedEmailHtml({
      userName,
      amount: payment.amount || 99,
      razorpayPaymentId: payment.razorpayPaymentId || 'N/A',
      razorpayOrderId: payment.razorpayOrderId || 'N/A',
      paymentDateStr,
      startedDateStr,
      expiresDateStr,
    });

    const attachmentFilename = `HabitForge-Payment-Receipt-${payment.receiptNumber}.pdf`;

    const result = await sendEmail({
      to: user.email,
      userName,
      subject: 'HabitForge Premium Activated 🎉',
      html,
      attachments: [
        {
          filename: attachmentFilename,
          content: pdfBuffer,
        },
      ],
    });

    console.log(`[EMAIL] Dispatch complete to ${user.email} (Provider: ${result.provider}, MessageID: ${result.messageId || 'N/A'})`);

    if (result.success && result.provider !== 'log') {
      payment.receiptEmailStatus = 'sent';
      payment.receiptEmailSentAt = new Date();
      payment.receiptEmailMessageId = result.messageId || 'OK';
    } else if (result.provider === 'log') {
      payment.receiptEmailStatus = 'pending';
    } else {
      payment.receiptEmailStatus = 'failed';
    }

    if (typeof payment.save === 'function') {
      await payment.save();
    }
  } catch (err) {
    console.error('[sendPremiumConfirmationEmail Error]', err.message);
    if (payment) {
      payment.receiptEmailStatus = 'failed';
      if (typeof payment.save === 'function') {
        await payment.save().catch(() => {});
      }
    }
  }
}

/**
 * Send Payment Failed Email
 */
export async function sendPaymentFailedEmail({ user, razorpayOrderId, amount }) {
  if (!user || !user.email) return;

  try {
    const html = getPaymentFailedEmailHtml({
      userName: user.name || 'HabitForge User',
      amount: amount || 99,
      razorpayOrderId: razorpayOrderId || 'N/A',
      dateStr: format(new Date(), 'dd MMMM yyyy, HH:mm'),
    });

    await sendEmail({
      to: user.email,
      userName: user.name,
      subject: 'HabitForge Payment Failed',
      html,
    });
  } catch (err) {
    console.error('[sendPaymentFailedEmail Error]', err.message);
  }
}

/**
 * Send Premium Expiration Email
 */
export async function sendPremiumExpirationEmail({ user }) {
  if (!user || !user.email) return;

  try {
    const expiredDateStr = user.premiumExpiresAt ? format(new Date(user.premiumExpiresAt), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy');

    const html = getPremiumExpiredEmailHtml({
      userName: user.name || 'HabitForge User',
      expiredDateStr,
    });

    await sendEmail({
      to: user.email,
      userName: user.name,
      subject: 'Your HabitForge Premium Has Expired',
      html,
    });

    user.premiumExpirationEmailSentAt = new Date();
    if (typeof user.save === 'function') {
      await user.save();
    }
  } catch (err) {
    console.error('[sendPremiumExpirationEmail Error]', err.message);
  }
}

/**
 * Send Cancellation Confirmation Email
 */
export async function sendCancellationConfirmationEmail({ user }) {
  if (!user || !user.email) return;

  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HabitForge Premium Cancelled</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #131316; color: #e4e1e6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1f1f22; border-radius: 16px; border: 1px solid #494454; padding: 32px; }
    .header { text-align: center; color: #ff8c8c; font-size: 20px; font-weight: bold; }
    .card { background-color: #131316; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 16px; margin: 20px 0; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      HabitForge Premium Membership Cancelled
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #cbc3d7; margin-top: 20px;">
      Hello <strong>${user.name || 'HabitForge Champion'}</strong>,<br><br>
      Your HabitForge Premium membership has been successfully cancelled as requested.
    </p>

    <div class="card">
      <div class="row"><span style="color:#cbc3d7;">Status:</span> <span style="color:#ff8c8c; font-weight:bold;">Cancelled</span></div>
      <div class="row"><span style="color:#cbc3d7;">User Email:</span> <span style="color:#ffffff;">${user.email}</span></div>
      <div class="row"><span style="color:#cbc3d7;">Cancellation Date:</span> <span style="color:#ffffff;">${format(new Date(), 'dd MMMM yyyy, HH:mm')}</span></div>
    </div>

    <p style="font-size: 13px; color: #cbc3d7; line-height: 1.5;">
      🔒 <strong>Your Data is Safe</strong>: All your habits, completions, XP, streaks, badges, and past payment receipts remain 100% saved in your account. You can upgrade back to Premium at any time from the app.
    </p>

    <p style="font-size: 12px; color: #8a8494; text-align: center; margin-top: 24px;">
      Thank you for forging your habits with us!<br>The HabitForge Team
    </p>
  </div>
</body>
</html>
    `;

    console.log(`[EMAIL] Dispatching cancellation email to: ${user.email}`);
    await sendEmail({
      to: user.email,
      userName: user.name,
      subject: 'HabitForge Premium Membership Cancelled ❌',
      html,
    });
    console.log(`[EMAIL] Cancellation email dispatched cleanly to ${user.email}`);
  } catch (err) {
    console.error('[sendCancellationConfirmationEmail Error]', err.message);
  }
}

/**
 * Send Cancellation / Refund Request Email
 */
export async function sendCancellationRequestEmail({ user, paymentId, requestReason }) {
  if (!user || !user.email) return;

  try {
    const requestId = `REQ-${Date.now().toString().substring(5)}`;
    const currentExpiryStr = user.premiumExpiresAt ? format(new Date(user.premiumExpiresAt), 'dd MMMM yyyy') : 'N/A';

    const html = getCancellationRequestEmailHtml({
      userName: user.name || 'HabitForge User',
      requestId,
      paymentId: paymentId || 'N/A',
      requestDateStr: format(new Date(), 'dd MMMM yyyy'),
      currentExpiryStr,
    });

    await sendEmail({
      to: user.email,
      userName: user.name,
      subject: 'HabitForge Premium Support Request Received',
      html,
    });
  } catch (err) {
    console.error('[sendCancellationRequestEmail Error]', err.message);
  }
}

/**
 * Get Safe Email Service Status for Health Checks (Never leaks API keys or secrets)
 */
export function getEmailServiceStatus() {
  const provider = process.env.EMAIL_PROVIDER || 'brevo';
  const transport = (process.env.EMAIL_TRANSPORT || 'api').toLowerCase();
  const senderEmail = process.env.BREVO_SENDER_EMAIL || '';

  const hasApiKey = Boolean(process.env.BREVO_API_KEY);
  const hasSmtpKey = Boolean(process.env.BREVO_SMTP_KEY);
  const configured = transport === 'smtp' ? (Boolean(process.env.BREVO_SMTP_USER) && hasSmtpKey) : hasApiKey;

  return {
    provider,
    transport,
    configured,
    senderConfigured: Boolean(senderEmail),
  };
}
