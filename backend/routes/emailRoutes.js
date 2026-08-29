import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendEmail, getEmailServiceStatus } from '../services/emailService.js';

const router = express.Router();

/**
 * @route   GET /api/email/status
 * @desc    Health check returning safe email provider & transport configuration status
 * @access  Public
 */
router.get('/status', (req, res) => {
  try {
    const status = getEmailServiceStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @route   POST /api/email/test
 * @desc    Send a test email to the authenticated user using active Brevo transport
 * @access  Private
 */
router.post('/test', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(400).json({ message: 'Authenticated user email missing' });
    }

    const testSubject = 'HabitForge Brevo Integration Test Email 🚀';
    const testHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #131316; color: #ffffff; padding: 24px; borderRadius: 16px;">
        <h2 style="color: #d0bcff;">HabitForge Brevo Integration Status</h2>
        <p>Hello <strong>${user.name || 'HabitForge User'}</strong>,</p>
        <p>This is a test email sent via your configured Brevo Email Service (Transport: <strong>${process.env.EMAIL_TRANSPORT || 'api'}</strong>).</p>
        <div style="background-color: #1f1f22; border: 1px solid rgba(255,255,255,0.1); padding: 16px; border-radius: 12px; margin: 16px 0;">
          <p style="margin: 4px 0; color: #cbc3d7;"><strong>Provider:</strong> Brevo</p>
          <p style="margin: 4px 0; color: #cbc3d7;"><strong>Transport Mode:</strong> ${process.env.EMAIL_TRANSPORT || 'api'}</p>
          <p style="margin: 4px 0; color: #cbc3d7;"><strong>Recipient:</strong> ${user.email}</p>
          <p style="margin: 4px 0; color: #cbc3d7;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="color: #10b981;">✓ Brevo email system is operating cleanly!</p>
      </div>
    `;

    const result = await sendEmail({
      to: user.email,
      userName: user.name,
      subject: testSubject,
      html: testHtml,
    });

    res.json({
      message: `Test email dispatched to ${user.email}`,
      provider: result.provider,
      transport: result.transport,
      messageId: result.messageId || null,
      status: result.success ? 'sent' : 'failed',
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to dispatch test email' });
  }
});

export default router;
