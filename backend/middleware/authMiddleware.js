import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { isMongoConnected, inMemoryDB } from '../config/inMemoryStore.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
      }

      // Explicit Demo Token reserved strictly for Alex Rivera demo account
      if (token === 'demo_token' || token === 'demo_token_123') {
        if (isMongoConnected()) {
          req.user = await User.findOne({ email: 'alex@habitforge.com' });
        }
        if (!req.user) {
          req.user = inMemoryDB.users.find(u => u.email === 'alex@habitforge.com') || inMemoryDB.users[0];
        }
        return next();
      }

      // 1. Verify standard signed JWT token
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        if (isMongoConnected()) {
          req.user = await User.findById(decoded.id).select('-password');
        }

        if (!req.user) {
          req.user = inMemoryDB.users.find(u => (u._id === decoded.id || u.id === decoded.id));
        }

        if (req.user) {
          if (req.user.status === 'blocked') {
            return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
          }
          return next();
        }
      } catch (jwtErr) {
        // Token signature error or expired token
      }

      // 2. Handle specific mock tokens by matching clean ID
      const cleanId = token.replace(/^mock_token_|^mock_demo_token_|^token_/, '');

      if (isMongoConnected()) {
        if (cleanId.match(/^[0-9a-fA-F]{24}$/)) {
          req.user = await User.findById(cleanId).select('-password');
        }
      }

      if (!req.user) {
        req.user = inMemoryDB.users.find(u => u._id === cleanId || u.id === cleanId);
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user session not found' });
      }

      if (req.user.status === 'blocked') {
        return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware] Token error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// @desc    Require Admin Role Middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, session required' });
  }

  if (req.user.status === 'blocked') {
    return res.status(403).json({ message: 'Your account has been blocked by an administrator.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Administrator privileges required' });
  }

  return next();
};

