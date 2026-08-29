import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { protectPremium } from '../middleware/premiumMiddleware.js';
import {
  get30DayCompletions,
  getHeatmap,
  getDayDetails,
  getAnalyticsOverview,
  exportHabitDataCSV,
} from '../controllers/analyticsController.js';

const router = express.Router();

router.use(protect);

router.get('/completions', get30DayCompletions);
router.get('/heatmap', getHeatmap);
router.get('/day-details', getDayDetails);
router.get('/overview', getAnalyticsOverview);
router.get('/export', protectPremium, exportHabitDataCSV);

export default router;
