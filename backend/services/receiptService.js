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
 * Generate PDF buffer for HabitForge Payment Receipt using pdfkit
 */
export function generateReceiptPdfBuffer({
  receiptNumber,
  userName,
  userEmail,
  planName = 'HabitForge Premium — 30 Days',
  amount = 99,
  currency = 'INR',
  paymentMethod = 'UPI / Online',
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

      // Brand Header Banner
      doc
        .rect(0, 0, 595.28, 90)
        .fill('#131316');

      doc
        .fillColor('#d0bcff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('HABITFORGE', 40, 25);

      doc
        .fillColor('#cbc3d7')
        .fontSize(10)
        .font('Helvetica')
        .text('OFFICIAL PAYMENT RECEIPT', 40, 55);

      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Receipt #: ${receiptNumber}`, 380, 35, { align: 'right' })
        .text(`Date: ${format(new Date(paymentDate), 'dd MMM yyyy')}`, 380, 50, { align: 'right' });

      doc.moveDown(3);

      // Status Badge
      doc
        .rect(40, 110, 515.28, 40)
        .fill('#1f1f22')
        .strokeColor('#a078ff')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor('#10b981')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('PAYMENT STATUS: PAID ✓', 55, 123);

      doc
        .fillColor('#d0bcff')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`Amount: ₹${amount} ${currency}`, 400, 124, { align: 'right' });

      // Customer & Transaction Details Section
      doc.moveDown(2);

      let currentY = 175;

      doc
        .fillColor('#a078ff')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('CUSTOMER INFORMATION', 40, currentY);

      currentY += 20;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#353438').stroke();

      currentY += 10;
      doc
        .fillColor('#8a8494')
        .fontSize(10)
        .font('Helvetica')
        .text('Customer Name:', 40, currentY)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text(userName || 'HabitForge User', 160, currentY);

      currentY += 18;
      doc
        .fillColor('#8a8494')
        .font('Helvetica')
        .text('Customer Email:', 40, currentY)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text(userEmail || 'N/A', 160, currentY);

      // Payment Details Table
      currentY += 35;
      doc
        .fillColor('#a078ff')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TRANSACTION DETAILS', 40, currentY);

      currentY += 20;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#353438').stroke();

      const details = [
        ['Selected Plan:', planName],
        ['Payment Method:', paymentMethod || 'UPI / Card / Online'],
        ['Razorpay Payment ID:', razorpayPaymentId],
        ['Razorpay Order ID:', razorpayOrderId],
        ['Payment Date & Time:', format(new Date(paymentDate), 'dd MMMM yyyy, HH:mm:ss')],
        ['Premium Start Date:', format(new Date(premiumStartedAt), 'dd MMMM yyyy')],
        ['Premium Expiry Date:', format(new Date(premiumExpiresAt), 'dd MMMM yyyy')],
      ];

      details.forEach(([label, value]) => {
        currentY += 18;
        doc
          .fillColor('#64748b')
          .fontSize(10)
          .font('Helvetica')
          .text(label, 40, currentY)
          .fillColor('#0f172a')
          .font('Helvetica-Bold')
          .text(value, 200, currentY);
      });

      // Itemized Table Header
      currentY += 40;
      doc
        .rect(40, currentY, 515.28, 25)
        .fill('#f1f5f9');

      doc
        .fillColor('#334155')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Item Description', 50, currentY + 7)
        .text('Period', 320, currentY + 7)
        .text('Total Price', 470, currentY + 7, { align: 'right' });

      currentY += 30;
      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica')
        .text('HabitForge Premium Access (Unlimited Habits, 365d Heatmap)', 50, currentY)
        .text('30 Days', 320, currentY)
        .font('Helvetica-Bold')
        .text(`₹${amount}.00`, 470, currentY, { align: 'right' });

      currentY += 20;
      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#cbd5e1').stroke();

      currentY += 15;
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Total Paid:', 350, currentY)
        .fillColor('#6d28d9')
        .fontSize(12)
        .text(`₹${amount}.00 ${currency}`, 470, currentY, { align: 'right' });

      // Footer
      doc
        .fontSize(9)
        .fillColor('#94a3b8')
        .font('Helvetica')
        .text('Thank you for choosing HabitForge! This is a system generated payment receipt.', 40, 750, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
