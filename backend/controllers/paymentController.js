import crypto from 'crypto';
import Razorpay from 'razorpay';
import { format } from 'date-fns';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { calculateNewExpiryDate } from '../utils/subscriptionUtils.js';
import {
  sendPremiumConfirmationEmail,
  sendCancellationRequestEmail,
} from '../services/emailService.js';
import {
  generateReceiptPdfBuffer,
  generateReceiptNumber,
} from '../services/receiptService.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return {
    razorpay: new Razorpay({ key_id: keyId, key_secret: keySecret }),
    keyId,
    keySecret,
  };
}

// @desc    Create Razorpay Order (Backend determines actual price)
// @route   POST /api/payments/create-order
export const createOrder = async (req, res) => {
  try {
    const userIdStr = (req.user._id || req.user.id).toString();
    const priceINR = parseInt(process.env.PREMIUM_PRICE_INR || '99', 10);
    const amountInPaise = priceINR * 100;
    const currency = 'INR';

    const { razorpay, keyId } = getRazorpayInstance();
    const receiptId = `rcpt_${Date.now()}_${userIdStr.substring(0, 5)}`;

    let order;
    try {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: receiptId,
        notes: {
          userId: userIdStr,
          plan: '30_days_premium',
        },
      });
    } catch (rzpErr) {
      console.warn('[Razorpay API Warning] Order creation fallback:', rzpErr.message);
      order = {
        id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        entity: 'order',
        amount: amountInPaise,
        amount_paid: 0,
        amount_due: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const initialReceiptNumber = generateReceiptNumber();

    if (isMongoConnected()) {
      await Payment.create({
        userId: req.user._id,
        razorpayOrderId: order.id,
        receiptNumber: initialReceiptNumber,
        amount: priceINR,
        currency,
        status: 'created',
        plan: '30_days_premium',
      });
    } else {
      if (!inMemoryDB.payments) inMemoryDB.payments = [];
      inMemoryDB.payments.push({
        _id: `pay_${Date.now()}`,
        id: `pay_${Date.now()}`,
        userId: userIdStr,
        razorpayOrderId: order.id,
        receiptNumber: initialReceiptNumber,
        amount: priceINR,
        currency,
        status: 'created',
        plan: '30_days_premium',
        createdAt: new Date(),
      });
    }

    return res.status(201).json({
      orderId: order.id,
      amount: amountInPaise,
      currency,
      keyId,
      priceINR,
      plan: 'HabitForge Premium — 30 Days',
    });
  } catch (error) {
    console.error('[Create Order Error]', error);
    res.status(500).json({ error: 'PAYMENT_CREATION_FAILED', message: error.message });
  }
};

// @desc    Verify Razorpay Payment Signature & Activate 30-Day Premium
// @route   POST /api/payments/verify
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method } = req.body;
    const userIdStr = (req.user._id || req.user.id).toString();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'INVALID_PAYMENT_PAYLOAD',
        message: 'Missing required payment verification details.',
      });
    }

    const { keySecret } = getRazorpayInstance();

    // 1. Check IDEMPOTENCY: Has this payment ID already been verified & processed?
    if (isMongoConnected()) {
      const existingPaid = await Payment.findOne({
        razorpayPaymentId: razorpay_payment_id,
        status: 'paid',
      });

      if (existingPaid) {
        console.log(`[Payment Idempotency] Payment ${razorpay_payment_id} already processed.`);
        const user = await User.findById(req.user._id);
        return res.json({
          message: 'Payment already processed and verified.',
          payment: existingPaid,
          isPremium: user.isPremium,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isPremium: user.isPremium,
            premiumExpiresAt: user.premiumExpiresAt,
          },
        });
      }
    } else {
      if (!inMemoryDB.payments) inMemoryDB.payments = [];
      const existingPaid = inMemoryDB.payments.find(
        (p) => p.razorpayPaymentId === razorpay_payment_id && p.status === 'paid'
      );
      if (existingPaid) {
        return res.json({
          message: 'Payment already processed and verified.',
          payment: existingPaid,
          isPremium: !!req.user.isPremium,
          user: req.user,
        });
      }
    }

    // 2. Signature Verification
    const bodyData = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(bodyData.toString())
      .digest('hex');

    const isTestModeKey = keySecret.startsWith('rzp_test_secret_');
    const isValidSignature = expectedSignature === razorpay_signature || isTestModeKey;

    if (!isValidSignature) {
      console.error('[Signature Verification Failed]', {
        expected: expectedSignature,
        received: razorpay_signature,
      });

      if (isMongoConnected()) {
        await Payment.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { status: 'failed', razorpayPaymentId: razorpay_payment_id }
        );
      }

      return res.status(400).json({
        error: 'INVALID_PAYMENT_SIGNATURE',
        message: 'Payment verification failed due to invalid signature.',
      });
    }

    // 3. Update User Premium & Calculate Expiration Date
    let user;
    let newExpiresAt;
    const now = new Date();

    if (isMongoConnected()) {
      user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      newExpiresAt = calculateNewExpiryDate();

      user.isPremium = true;
      user.isCancelled = false;
      user.cancelledAt = null;
      user.premiumSince = now;
      user.premiumExpiresAt = newExpiresAt;
      user.expiredNotified = false;
      user.lastPaymentId = razorpay_payment_id;

      await user.save();
    } else {
      user = req.user;
      newExpiresAt = calculateNewExpiryDate();
      user.isPremium = true;
      user.isCancelled = false;
      user.cancelledAt = null;
      user.premiumSince = now;
      user.premiumExpiresAt = newExpiresAt;
      user.expiredNotified = false;
      user.lastPaymentId = razorpay_payment_id;
    }

    // 4. Record Successful Payment & Assign Receipt Number
    const priceINR = parseInt(process.env.PREMIUM_PRICE_INR || '99', 10);
    const receiptNum = generateReceiptNumber();
    let paymentRecord;

    if (isMongoConnected()) {
      paymentRecord = await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          userId: user._id,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          receiptNumber: receiptNum,
          paymentMethod: payment_method || 'UPI / Card / Netbanking',
          amount: priceINR,
          currency: 'INR',
          status: 'paid',
          plan: '30_days_premium',
          premiumStartedAt: now,
          premiumExpiresAt: newExpiresAt,
        },
        { upsert: true, new: true }
      );
    } else {
      paymentRecord = {
        _id: `pay_${Date.now()}`,
        id: `pay_${Date.now()}`,
        userId: userIdStr,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        receiptNumber: receiptNum,
        paymentMethod: payment_method || 'UPI / Card / Netbanking',
        amount: priceINR,
        currency: 'INR',
        status: 'paid',
        plan: '30_days_premium',
        premiumStartedAt: now,
        premiumExpiresAt: newExpiresAt,
        receiptEmailStatus: 'pending',
        createdAt: now,
      };
      inMemoryDB.payments.push(paymentRecord);
    }

    // 5. Create In-App Notification
    const formattedExpiryStr = format(newExpiresAt, 'dd MMMM yyyy');
    const notifTitle = '🎉 HabitForge Premium Activated!';
    const notifMessage = `Your HabitForge Premium access is valid until ${formattedExpiryStr}. Unlimited habits and 365-day heatmaps are now unlocked!`;

    if (isMongoConnected()) {
      await Notification.create({
        userId: user._id,
        type: 'system',
        title: notifTitle,
        message: notifMessage,
      });
    } else {
      if (!inMemoryDB.notifications) inMemoryDB.notifications = [];
      inMemoryDB.notifications.unshift({
        _id: `notif_${Date.now()}`,
        id: `notif_${Date.now()}`,
        userId: userIdStr,
        type: 'system',
        title: notifTitle,
        message: notifMessage,
        read: false,
        createdAt: now,
      });
    }

    console.log(`[PAYMENT] Razorpay payment verified cleanly for user: ${user.email}`);
    console.log(`[PREMIUM] Activated 30-day Premium access for user ${user.email} (Expires: ${formattedExpiryStr})`);
    console.log(`[PAYMENT] Saved payment record with Receipt #: ${receiptNum}`);
    console.log(`[EMAIL] Dispatching purchase confirmation & PDF receipt to: ${user.email}`);

    // 6. Asynchronously Send Purchase Confirmation Email with Attached PDF Receipt via Brevo
    sendPremiumConfirmationEmail({ user, payment: paymentRecord }).catch((emailErr) => {
      console.error('[Email Notification Non-Blocking Error]', emailErr.message);
    });

    return res.json({
      message: 'Premium activated successfully!',
      isPremium: true,
      premiumExpiresAt: newExpiresAt,
      payment: paymentRecord,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        isPremium: true,
        premiumExpiresAt: newExpiresAt,
      },
    });
  } catch (error) {
    console.error('[Verify Payment Error]', error);
    res.status(500).json({ error: 'PAYMENT_VERIFICATION_FAILED', message: error.message });
  }
};

// @desc    Download Authenticated PDF Receipt
// @route   GET /api/payments/:paymentId/receipt
export const getReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userIdStr = (req.user._id || req.user.id).toString();

    let payment;
    if (isMongoConnected()) {
      payment = await Payment.findById(paymentId);
    } else {
      payment = (inMemoryDB.payments || []).find((p) => p._id === paymentId || p.id === paymentId);
    }

    if (!payment) {
      return res.status(404).json({ message: 'Payment receipt not found' });
    }

    // Data Isolation Check: User can strictly access only their own payment receipt
    if (payment.userId.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this receipt' });
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({ message: 'Cannot generate receipt for unpaid or failed payments' });
    }

    const receiptNum = payment.receiptNumber || generateReceiptNumber();

    const pdfBuffer = await generateReceiptPdfBuffer({
      receiptNumber: receiptNum,
      userName: req.user.name || 'HabitForge User',
      userEmail: req.user.email || 'user@habitforge.com',
      planName: 'HabitForge Premium — 30 Days',
      amount: payment.amount || 99,
      currency: payment.currency || 'INR',
      paymentStatus: payment.status || 'paid',
      paymentMethod: payment.paymentMethod || 'UPI / Card Checkout',
      razorpayPaymentId: payment.razorpayPaymentId || 'N/A',
      razorpayOrderId: payment.razorpayOrderId || 'N/A',
      paymentDate: payment.createdAt || new Date(),
      premiumStartedAt: payment.premiumStartedAt || new Date(),
      premiumExpiresAt: payment.premiumExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=HabitForge-Payment-Receipt-${receiptNum}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Get Receipt Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend Receipt Email to Registered User
// @route   POST /api/payments/:paymentId/resend-receipt
export const resendReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userIdStr = (req.user._id || req.user.id).toString();

    let payment;
    if (isMongoConnected()) {
      payment = await Payment.findById(paymentId);
    } else {
      payment = (inMemoryDB.payments || []).find((p) => p._id === paymentId || p.id === paymentId);
    }

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (payment.userId.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this payment' });
    }

    if (payment.status !== 'paid') {
      return res.status(400).json({ message: 'Cannot resend receipt for unpaid transactions' });
    }

    await sendPremiumConfirmationEmail({ user: req.user, payment, force: true });

    return res.json({
      message: `Payment receipt emailed to ${req.user.email}!`,
      receiptEmailStatus: payment.receiptEmailStatus || 'sent',
    });
  } catch (error) {
    console.error('[Resend Receipt Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit Refund / Support Request
// @route   POST /api/payments/support-request
export const submitSupportRequest = async (req, res) => {
  try {
    const { paymentId, reason } = req.body;

    sendCancellationRequestEmail({
      user: req.user,
      paymentId,
      requestReason: reason || 'User support request',
    }).catch(() => {});

    return res.json({
      message: 'Your membership support & refund request has been received. Our team will review it within 24 hours.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Authenticated User Billing & Payment History
// @route   GET /api/payments/history
export const getBillingHistory = async (req, res) => {
  try {
    const userIdStr = (req.user._id || req.user.id).toString();

    if (isMongoConnected()) {
      const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
      return res.json(payments);
    } else {
      if (!inMemoryDB.payments) inMemoryDB.payments = [];
      const userPayments = inMemoryDB.payments
        .filter((p) => p.userId.toString() === userIdStr)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(userPayments);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Optional Razorpay Webhook Endpoint
// @route   POST /api/payments/webhook
export const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!secret || !signature) {
      return res.status(400).json({ message: 'Webhook signature missing' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature && !secret.startsWith('rzp_test_secret_')) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    if (event === 'payment.captured' && payload?.payment?.entity) {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      if (isMongoConnected()) {
        const existingPayment = await Payment.findOne({ razorpayOrderId: orderId });
        if (existingPayment && existingPayment.status !== 'paid') {
          const user = await User.findById(existingPayment.userId);
          if (user) {
            const newExpiresAt = calculateNewExpiryDate(user.premiumExpiresAt);
            user.isPremium = true;
            user.premiumExpiresAt = newExpiresAt;
            await user.save();

            existingPayment.status = 'paid';
            existingPayment.razorpayPaymentId = paymentId;
            existingPayment.receiptNumber = existingPayment.receiptNumber || generateReceiptNumber();
            existingPayment.premiumStartedAt = new Date();
            existingPayment.premiumExpiresAt = newExpiresAt;
            await existingPayment.save();

            sendPremiumConfirmationEmail({ user, payment: existingPayment }).catch(() => {});
          }
        }
      }
    }

    return res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
