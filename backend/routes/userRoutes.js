import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getUserProfile,
  updateUserProfile,
  upgradeToPremium,
  cancelPremium,
  getDashboardSummary,
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard-summary', getDashboardSummary);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/upgrade-premium', upgradeToPremium);
router.post('/cancel-premium', cancelPremium);

export default router;
