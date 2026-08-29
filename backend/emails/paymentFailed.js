export function getPaymentFailedEmailHtml({ userName, amount, razorpayOrderId, dateStr }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HabitForge Payment Attempt Notice</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #131316; color: #e4e1e6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1f1f22; border-radius: 16px; border: 1px solid #ef4444; padding: 32px; }
    .header { text-align: center; color: #f87171; font-size: 20px; font-weight: bold; }
    .cta-btn { display: block; width: 220px; margin: 24px auto 0; text-align: center; background: #ef4444; color: #ffffff; font-weight: 800; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ⚠️ HabitForge Payment Could Not Be Completed
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #cbc3d7; margin-top: 20px;">
      Hello <strong>${userName}</strong>,<br><br>
      Your recent payment attempt of <strong>₹${amount || 99} INR</strong> for HabitForge Premium could not be completed.<br><br>
      <strong>Order ID:</strong> ${razorpayOrderId || 'N/A'}<br>
      <strong>Date:</strong> ${dateStr}
    </p>

    <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; font-size: 13px; color: #fca5a5;">
      ℹ️ <strong>Note:</strong> No money was charged and no Premium access was added. You may attempt the transaction again anytime from the Upgrade page.
    </div>

    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/premium" class="cta-btn">Try Again</a>
  </div>
</body>
</html>
  `;
}
