export function getPremiumActivatedEmailHtml({ userName, amount, razorpayPaymentId, razorpayOrderId, paymentDateStr, startedDateStr, expiresDateStr }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HabitForge Premium 🎉</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #131316; color: #e4e1e6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1f1f22; border-radius: 16px; border: 1px solid #494454; padding: 32px; overflow: hidden; }
    .header { text-align: center; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .logo-badge { display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #6d3bd7, #a078ff); border-radius: 12px; line-height: 48px; font-size: 24px; color: #fff; font-weight: bold; margin-bottom: 12px; }
    .title { color: #ffffff; font-size: 24px; font-weight: 800; margin: 8px 0; }
    .subtitle { color: #d0bcff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .card { background-color: #131316; border-radius: 12px; border: 1px solid rgba(208, 188, 255, 0.2); padding: 20px; margin: 24px 0; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .label { color: #cbc3d7; }
    .value { color: #ffffff; font-weight: 600; font-family: monospace; }
    .highlight { color: #d0bcff; font-weight: 700; }
    .features { background-color: rgba(160, 120, 255, 0.08); border-radius: 12px; border: 1px solid rgba(160, 120, 255, 0.2); padding: 20px; margin: 24px 0; }
    .features h4 { color: #d0bcff; margin-top: 0; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; }
    .feature-item { color: #e4e1e6; font-size: 13px; margin: 6px 0; display: flex; align-items: center; }
    .feature-item span { color: #10b981; margin-right: 8px; font-weight: bold; }
    .cta-btn { display: block; width: 220px; margin: 28px auto 12px; text-align: center; background: linear-gradient(135deg, #a078ff, #d0bcff); color: #340080; font-weight: 800; font-size: 14px; padding: 14px 24px; border-radius: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { text-align: center; font-size: 12px; color: #8a8494; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">⚒</div>
      <div class="subtitle">HabitForge Premium Tier</div>
      <h1 class="title">Welcome to HabitForge Premium 🎉</h1>
    </div>

    <p style="font-size: 15px; line-height: 1.6; color: #cbc3d7;">
      Hello <strong style="color: #ffffff;">${userName}</strong>,<br><br>
      Your HabitForge Premium membership has been activated successfully! You now have full access to all power tools and long-term consistency features.
    </p>

    <div class="card">
      <div class="row">
        <span class="label">Selected Plan</span>
        <span class="value highlight">HabitForge Premium — 30 Days</span>
      </div>
      <div class="row">
        <span class="label">Amount Paid</span>
        <span class="value">₹${amount} INR</span>
      </div>
      <div class="row">
        <span class="label">Payment ID</span>
        <span class="value">${razorpayPaymentId}</span>
      </div>
      <div class="row">
        <span class="label">Order ID</span>
        <span class="value">${razorpayOrderId}</span>
      </div>
      <div class="row">
        <span class="label">Payment Date</span>
        <span class="value">${paymentDateStr}</span>
      </div>
      <div class="row">
        <span class="label">Premium Started</span>
        <span class="value">${startedDateStr}</span>
      </div>
      <div class="row">
        <span class="label">Premium Expires</span>
        <span class="value highlight">${expiresDateStr}</span>
      </div>
    </div>

    <div class="features">
      <h4>⚡ Unlocked PRO Benefits</h4>
      <div class="feature-item"><span>✓</span> 365-Day Full Activity Heatmap</div>
      <div class="feature-item"><span>✓</span> Unlimited Active Habits Limit</div>
      <div class="feature-item"><span>✓</span> Complete CSV Data Export Capability</div>
      <div class="feature-item"><span>✓</span> 90-Day & 1-Year Analytics Range Filters</div>
      <div class="feature-item"><span>✓</span> Premium Crown Badge on Social Leaderboard</div>
    </div>

    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="cta-btn">Open HabitForge</a>

    <div class="footer">
      HabitForge — Forging Lasting Habits & Peak Performance.<br>
      If you have questions regarding your transaction, please contact support.
    </div>
  </div>
</body>
</html>
  `;
}
