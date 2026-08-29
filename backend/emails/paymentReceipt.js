export function getPaymentReceiptEmailHtml({ userName, receiptNumber, expiresDateStr }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HabitForge Premium Payment Receipt</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #131316; color: #e4e1e6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1f1f22; border-radius: 16px; border: 1px solid #494454; padding: 32px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .title { color: #ffffff; font-size: 22px; font-weight: 800; }
    .cta-btn { display: block; width: 220px; margin: 24px auto 0; text-align: center; background: #a078ff; color: #340080; font-weight: 800; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 class="title">HabitForge Premium Payment Receipt</h2>
      <p style="color: #d0bcff; font-size: 13px;">Receipt Ref: <strong>${receiptNumber}</strong></p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #cbc3d7; margin-top: 20px;">
      Hello <strong>${userName}</strong>,<br><br>
      Thank you for upgrading to HabitForge Premium. Your payment was processed successfully and your Premium access is fully active.
    </p>

    <p style="font-size: 14px; color: #e4e1e6; background: rgba(160,120,255,0.1); padding: 16px; border-radius: 12px; border: 1px solid rgba(160,120,255,0.2);">
      📄 <strong>Official Receipt Attached:</strong> Your payment receipt PDF (<code>HabitForge-Payment-Receipt-${receiptNumber}.pdf</code>) is attached to this email.<br><br>
      ⏰ Premium Active Until: <strong style="color: #d0bcff;">${expiresDateStr}</strong>
    </p>

    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/settings" class="cta-btn">View Billing History</a>
  </div>
</body>
</html>
  `;
}
