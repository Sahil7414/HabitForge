import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

export function generatePaymentReceiptPDF({ user, payment }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc
        .rect(0, 0, doc.page.width, 100)
        .fill('#1a1a24');

      doc
        .fillColor('#d0bcff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('HABITFORGE', 40, 35);

      doc
        .fillColor('#cbc3d7')
        .fontSize(10)
        .font('Helvetica')
        .text('Gamified Habit Tracking & Consistency Platform', 40, 65);

      doc
        .fillColor('#ffffff')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', doc.page.width - 180, 45, { align: 'right' });

      // Body Section
      doc.moveDown(4);

      // Customer Info Box
      const startY = 120;
      doc
        .fillColor('#333333')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('CUSTOMER DETAILS', 40, startY);

      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Name: ${user.name || 'Valued User'}`, 40, startY + 18)
        .text(`Email: ${user.email}`, 40, startY + 34);

      // Receipt Metadata Box
      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text('RECEIPT METADATA', 300, startY);

      const paymentDateStr = payment.createdAt
        ? format(new Date(payment.createdAt), 'dd MMMM yyyy, HH:mm:ss')
        : format(new Date(), 'dd MMMM yyyy');

      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`Payment ID: ${payment.razorpayPaymentId || 'N/A'}`, 300, startY + 18)
        .text(`Order ID: ${payment.razorpayOrderId}`, 300, startY + 34)
        .text(`Date: ${paymentDateStr}`, 300, startY + 50);

      // Divider
      doc
        .moveDown()
        .strokeColor('#e0e0e0')
        .lineWidth(1)
        .moveTo(40, startY + 80)
        .lineTo(doc.page.width - 40, startY + 80)
        .stroke();

      // Itemized Table Header
      const tableY = startY + 95;
      doc
        .rect(40, tableY, doc.page.width - 80, 25)
        .fill('#f4f0ff');

      doc
        .fillColor('#340080')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('ITEM DESCRIPTION', 50, tableY + 7)
        .text('PERIOD', 260, tableY + 7)
        .text('STATUS', 400, tableY + 7)
        .text('AMOUNT', 480, tableY + 7, { align: 'right' });

      // Item Row
      const rowY = tableY + 35;
      const startDateStr = payment.premiumStartedAt
        ? format(new Date(payment.premiumStartedAt), 'dd MMM yyyy')
        : format(new Date(), 'dd MMM yyyy');
      const endDateStr = payment.premiumExpiresAt
        ? format(new Date(payment.premiumExpiresAt), 'dd MMM yyyy')
        : 'N/A';

      doc
        .fillColor('#222222')
        .font('Helvetica-Bold')
        .text('HabitForge Premium — 30 Days', 50, rowY)
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#666666')
        .text(`(${startDateStr} - ${endDateStr})`, 260, rowY)
        .fillColor('#10b981')
        .font('Helvetica-Bold')
        .text('PAID', 400, rowY)
        .fillColor('#222222')
        .text(`INR ₹${payment.amount || 99}`, 480, rowY, { align: 'right' });

      // Divider below row
      doc
        .strokeColor('#eeeeee')
        .moveTo(40, rowY + 20)
        .lineTo(doc.page.width - 40, rowY + 20)
        .stroke();

      // Total Section
      const totalY = rowY + 35;
      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('TOTAL PAID:', 380, totalY)
        .fillColor('#7c3aed')
        .fontSize(14)
        .text(`₹${payment.amount || 99}.00 INR`, 480, totalY - 2, { align: 'right' });

      // Benefits Included
      doc.moveDown(5);

      const featuresY = totalY + 60;
      doc
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('INCLUDED PREMIUM BENEFITS:', 40, featuresY);

      const benefits = [
        '✓ Unlimited Active Habit Slots',
        '✓ Full 365-Day Activity Heatmap',
        '✓ Advanced Analytics Filters (7d, 30d, 90d, 1y)',
        '✓ CSV Data Export Capability',
        '✓ PRO Crown Badge on Leaderboards',
      ];

      benefits.forEach((b, idx) => {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#555555')
          .text(b, 50, featuresY + 18 + idx * 16);
      });

      // Footer
      const footerY = doc.page.height - 60;
      doc
        .strokeColor('#e0e0e0')
        .moveTo(40, footerY - 10)
        .lineTo(doc.page.width - 40, footerY - 10)
        .stroke();

      doc
        .fillColor('#888888')
        .fontSize(8)
        .font('Helvetica')
        .text('Thank you for choosing HabitForge! This is a computer-generated receipt.', 40, footerY, {
          align: 'center',
          width: doc.page.width - 80,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
