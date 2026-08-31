import { generateReceiptPdfBuffer, generateReceiptNumber } from './receiptService.js';

export function generatePaymentReceiptPDF({ user, payment }) {
  return generateReceiptPdfBuffer({
    receiptNumber: payment?.receiptNumber || generateReceiptNumber(),
    userName: user?.name || 'HabitForge User',
    userEmail: user?.email || 'user@habitforge.com',
    planName: payment?.plan === '30_days_premium' ? 'HabitForge Premium — 30 Days' : (payment?.plan || 'HabitForge Premium — 30 Days'),
    amount: payment?.amount || 99,
    currency: payment?.currency || 'INR',
    paymentStatus: payment?.status || 'paid',
    paymentMethod: payment?.paymentMethod || 'UPI / Card / Netbanking',
    razorpayPaymentId: payment?.razorpayPaymentId || 'N/A',
    razorpayOrderId: payment?.razorpayOrderId || 'N/A',
    paymentDate: payment?.createdAt || new Date(),
    premiumStartedAt: payment?.premiumStartedAt || payment?.createdAt || new Date(),
    premiumExpiresAt: payment?.premiumExpiresAt || user?.premiumExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}
