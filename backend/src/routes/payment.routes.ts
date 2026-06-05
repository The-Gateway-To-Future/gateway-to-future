import { Router } from 'express';
import { body } from 'express-validator';
import { PaymentController } from '../controllers/payment.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateJWT, requireStudent } from '../middleware/auth.middleware';

const router = Router();

// POST /api/payments/checkout - Student only (Initiates order)
router.post(
  '/checkout',
  authenticateJWT,
  requireStudent,
  [
    body('bookingId').trim().notEmpty().withMessage('bookingId is required.'),
  ],
  validateRequest,
  PaymentController.checkout
);

// POST /api/payments/verify - Student only (Verifies signature and updates database)
router.post(
  '/verify',
  authenticateJWT,
  requireStudent,
  [
    body('razorpay_order_id').trim().notEmpty().withMessage('razorpay_order_id is required.'),
    body('razorpay_payment_id').trim().notEmpty().withMessage('razorpay_payment_id is required.'),
    body('razorpay_signature').trim().notEmpty().withMessage('razorpay_signature is required.'),
  ],
  validateRequest,
  PaymentController.verifyClientPayment
);

// POST /api/payments/webhook - Webhook callback from Razorpay (signature verified inside controller via rawBody)
router.post('/webhook', PaymentController.webhook);

export default router;
