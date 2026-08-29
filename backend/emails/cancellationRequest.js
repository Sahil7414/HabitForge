export function getCancellationRequestEmailHtml({ userName, requestId, paymentId, requestDateStr, currentExpiryStr }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HabitForge Premium Support Request Received</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #131316; color: #e4e1e6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1f1f22; border-radius: 16px; border: 1px solid #494454; padding: 32px; }
    .header { text-align: center; color: #d0bcff; font-size: 20px; font-weight: bold; }
    .card { background-color: #131316; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 16px; margin: 20px 0; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      HabitForge Support Request Received
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #cbc3d7; margin-top: 20px;">
      Hello <strong>${userName}</strong>,<br><br>
      We have received your membership support & refund request. HabitForge Premium is a non-recurring one-time 30-day purchase. Our support team will review your ticket within 24 hours.
    </p>

    <div class="card">
      <div class="row"><span style="color:#cbc3d7;">Request ID:</span> <span style="color:#ffffff; font-family:monospace;">${requestId}</span></div>
      <div class="row"><span style="color:#cbc3d7;">Payment ID:</span> <span style="color:#ffffff; font-family:monospace;">${paymentId}</span></div>
      <div class="row"><span style="color:#cbc3d7;">Request Date:</span> <span style="color:#ffffff;">${requestDateStr}</span></div>
      <div class="row"><span style="color:#cbc3d7;">Current Premium Expiry:</span> <span style="color:#d0bcff;">${currentExpiryStr}</span></div>
    </div>

    <p style="font-size: 12px; color: #8a8494; text-align: center;">
      Thank you,<br>HabitForge Support Team
    </p>
  </div>
</body>
</html>
  `;
}
