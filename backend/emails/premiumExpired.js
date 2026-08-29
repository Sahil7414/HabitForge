export function getPremiumExpiredEmailHtml({ userName, expiredDateStr }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your HabitForge Premium has expired</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #131316; color: #e4e1e6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1f1f22; border-radius: 16px; border: 1px solid #494454; padding: 32px; }
    .header { text-align: center; color: #ffb95f; font-size: 22px; font-weight: 800; }
    .features { background: rgba(255,185,95,0.08); border-radius: 12px; border: 1px solid rgba(255,185,95,0.2); padding: 16px; margin: 20px 0; }
    .cta-btn { display: block; width: 220px; margin: 24px auto 0; text-align: center; background: linear-gradient(135deg, #a078ff, #d0bcff); color: #340080; font-weight: 800; font-size: 14px; padding: 14px 24px; border-radius: 12px; text-decoration: none; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      👑 Your HabitForge Premium Access Has Expired
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #cbc3d7; margin-top: 20px;">
      Hello <strong>${userName}</strong>,<br><br>
      Your HabitForge Premium access expired on <strong>${expiredDateStr}</strong>.<br><br>
      Your account has automatically returned to the Free plan.
    </p>

    <div class="features">
      <h4 style="color: #ffb95f; margin: 0 0 10px 0;">Features locked on Free tier:</h4>
      <div style="font-size: 13px; color: #cbc3d7; margin: 4px 0;">⚠️ Heatmap restricted back to 90 days</div>
      <div style="font-size: 13px; color: #cbc3d7; margin: 4px 0;">⚠️ Habit limit capped at 5 active habits</div>
      <div style="font-size: 13px; color: #cbc3d7; margin: 4px 0;">⚠️ CSV Data Export disabled</div>
      <div style="font-size: 13px; color: #cbc3d7; margin: 4px 0;">⚠️ 90-Day & 1-Year analytics range filters locked</div>
    </div>

    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/premium" class="cta-btn">Renew Premium</a>
  </div>
</body>
</html>
  `;
}
