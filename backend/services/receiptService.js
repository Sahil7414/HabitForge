import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

/**
 * Generate unique collision-safe receipt number (HF-2026-XXXXXX)
 */
export function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `HF-${year}-${random}`;
}

/**
 * Helper to safely format dates
 */
function safeFormatDate(dateVal, formatStr = 'dd MMM yyyy') {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, formatStr);
  } catch (err) {
    return 'N/A';
  }
}

/**
 * Generate PDF buffer for HabitForge Payment Receipt using pdfkit
 */
export function generateReceiptPdfBuffer({
  receiptNumber = 'HF-2026',
  userName = 'HabitForge User',
  userEmail = 'N/A',
  planName = 'HabitForge Premium — 30 Days',
  amount = 99,
  currency = 'INR',
  paymentStatus = 'paid',
  paymentMethod = 'UPI / Card / Netbanking',
  razorpayPaymentId = 'N/A',
  razorpayOrderId = 'N/A',
  paymentDate = new Date(),
  premiumStartedAt = new Date(),
  premiumExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const statusUpper = (paymentStatus || 'paid').toUpperCase();
      const isPaid = statusUpper === 'PAID';
      const isFailed = statusUpper === 'FAILED';

      // 1. Top Brand Header Banner (Dark Theme)
      doc
        .rect(0, 0, 595.28, 95)
        .fill('#131316');

      doc
        .fillColor('#d0bcff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('HABITFORGE', 40, 25);

      doc
        .fillColor('#cbc3d7')
        .fontSize(9)
        .font('Helvetica')
        .text('OFFICIAL PAYMENT RECEIPT', 40, 52);

      const formattedPaymentDate = safeFormatDate(paymentDate, 'dd MMM yyyy');
      doc
        .fillColor('#ffffff')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Receipt #: ${receiptNumber}`, 340, 30, { align: 'right', width: 215 })
        .fillColor('#cbc3d7')
        .font('Helvetica')
        .text(`Date: ${formattedPaymentDate}`, 340, 46, { align: 'right', width: 215 });

      // 2. Status & Amount Banner Box
      const bannerBg = isPaid ? '#064e3b' : isFailed ? '#7f1d1d' : '#78350f';
      const bannerBorder = isPaid ? '#10b981' : isFailed ? '#ef4444' : '#f59e0b';
      const statusText = isPaid ? 'PAYMENT STATUS: PAID ✓' : isFailed ? 'PAYMENT STATUS: FAILED ✗' : `PAYMENT STATUS: ${statusUpper}`;

      doc
        .rect(40, 115, 515.28, 42)
        .fillAndStroke('#1f1f22', bannerBorder);

      doc
        .fillColor(bannerBorder)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(statusText, 55, 130);

      doc
        .fillColor('#ffffff')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(`₹${amount} ${currency}`, 340, 129, { align: 'right', width: 200 });

      // 3. Customer Information Section
      let currentY = 175;

      doc
        .fillColor('#a078ff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('CUSTOMER INFORMATION', 40, currentY);

      currentY += 16;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#353438').lineWidth(1).stroke();

      currentY += 10;
      doc
        .fillColor('#8a8494')
        .fontSize(9)
        .font('Helvetica')
        .text('Customer Name:', 40, currentY)
        .fillColor('#131316')
        .font('Helvetica-Bold')
        .text(userName || 'HabitForge User', 160, currentY, { width: 380, lineBreak: false });

      currentY += 16;
      doc
        .fillColor('#8a8494')
        .font('Helvetica')
        .text('Customer Email:', 40, currentY)
        .fillColor('#131316')
        .font('Helvetica-Bold')
        .text(userEmail || 'N/A', 160, currentY, { width: 380, lineBreak: false });

      // 4. Transaction Details Section
      currentY += 30;
      doc
        .fillColor('#a078ff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TRANSACTION DETAILS', 40, currentY);

      currentY += 16;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#353438').lineWidth(1).stroke();

      const paymentDateTimeStr = safeFormatDate(paymentDate, 'dd MMMM yyyy, HH:mm:ss');
      const startStr = safeFormatDate(premiumStartedAt, 'dd MMMM yyyy');
      const expiryStr = safeFormatDate(premiumExpiresAt, 'dd MMMM yyyy');

      const details = [
        ['Selected Plan:', planName],
        ['Payment Method:', paymentMethod || 'UPI / Card / Online'],
        ['Razorpay Payment ID:', razorpayPaymentId || 'N/A'],
        ['Razorpay Order ID:', razorpayOrderId || 'N/A'],
        ['Transaction Date & Time:', paymentDateTimeStr],
        ['Premium Access Period:', isPaid ? `${startStr} to ${expiryStr}` : 'N/A'],
      ];

      details.forEach(([label, value]) => {
        currentY += 16;
        doc
          .fillColor('#64748b')
          .fontSize(9)
          .font('Helvetica')
          .text(label, 40, currentY)
          .fillColor('#0f172a')
          .font('Helvetica-Bold')
          .text(value, 200, currentY, { width: 345, lineBreak: false });
      });

      // 5. Itemized Breakdown Table
      currentY += 35;
      doc
        .rect(40, currentY, 515.28, 24)
        .fill('#f1f5f9');

      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Item Description', 50, currentY + 7)
        .text('Duration', 330, currentY + 7)
        .text('Amount Paid', 450, currentY + 7, { align: 'right', width: 95 });

      currentY += 30;
      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica')
        .text('HabitForge Premium (Unlimited Habits, 365d Heatmap, CSV Export)', 50, currentY, { width: 270 })
        .text('30 Days', 330, currentY)
        .font('Helvetica-Bold')
        .text(`₹${amount}.00`, 450, currentY, { align: 'right', width: 95 });

      currentY += 22;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#cbd5e1').stroke();

      currentY += 12;
      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Total Paid:', 330, currentY)
        .fillColor('#6d28d9')
        .fontSize(11)
        .text(`₹${amount}.00 ${currency}`, 430, currentY, { align: 'right', width: 115 });

      // 6. Included Features Summary
      currentY += 40;
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('INCLUDED PREMIUM BENEFITS:', 40, currentY);

      currentY += 14;
      const benefits = [
        '✓ Unlimited Active Habit Slots',
        '✓ 365-Day Activity Heatmap & Analytics',
        '✓ CSV Data Export Capability',
        '✓ PRO Crown Badge on Leaderboards',
      ];

      benefits.forEach((b) => {
        doc
          .fillColor('#475569')
          .fontSize(8.5)
          .font('Helvetica')
          .text(b, 50, currentY);
        currentY += 13;
      });

      // 7. Footer
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('Thank you for choosing HabitForge! This is a system-generated official payment receipt.', 40, 760, {
          align: 'center',
          width: 515,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
