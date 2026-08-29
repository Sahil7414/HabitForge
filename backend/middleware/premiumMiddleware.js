export function protectPremium(req, res, next) {
  const isPremiumActive =
    req.user &&
    req.user.isPremium &&
    (!req.user.premiumExpiresAt || new Date(req.user.premiumExpiresAt) > new Date());

  if (isPremiumActive) {
    return next();
  }

  return res.status(403).json({
    error: 'PREMIUM_REQUIRED',
    message: 'HabitForge Premium is required to access this feature.',
  });
}

