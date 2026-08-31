import express from 'express';
import {
  getAdminOverview,
  getAllUsersAdmin,
  getUserDetailsAdmin,
  updateUserStatusAdmin,
} from '../controllers/adminController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Strict backend protection: all routes require authenticated session + admin role
router.use(protect);
router.use(requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/users', getAllUsersAdmin);
router.get('/users/:id', getUserDetailsAdmin);
router.put('/users/:id/status', updateUserStatusAdmin);

export default router;
