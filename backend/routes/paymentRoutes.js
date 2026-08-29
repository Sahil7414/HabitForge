import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createOrder,
  verifyPayment,
  getBillingHistory,
  getReceipt,
  resendReceipt,
  submitSupportRequest,
  handleWebhook,
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getBillingHistory);
router.get('/:paymentId/receipt', protect, getReceipt);
router.post('/:paymentId/resend-receipt', protect, resendReceipt);
router.post('/support-request', protect, submitSupportRequest);
router.post('/webhook', handleWebhook);

export default router;
