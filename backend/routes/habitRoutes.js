import express from 'express';
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  checkInHabit,
  getHabitHistory,
} from '../controllers/habitController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All habit routes require JWT authentication

router.route('/').get(getHabits).post(createHabit);
router.route('/:id').put(updateHabit).delete(deleteHabit);
router.post('/:id/check-in', checkInHabit);
router.get('/:id/history', getHabitHistory);

export default router;
