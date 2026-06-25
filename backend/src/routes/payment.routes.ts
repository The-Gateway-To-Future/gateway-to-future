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

// POST /api/payments/counseling/checkout - Student only (Initiates counseling order)
router.post(
  '/counseling/checkout',
  authenticateJWT,
  requireStudent,
  [
    body('date').isISO8601().withMessage('Booking date must be a valid date in YYYY-MM-DD format.'),
    body('notes').optional().trim(),
  ],
  validateRequest,
  PaymentController.counselingCheckout
);

// POST /api/payments/counseling/guest-checkout - Public (Guest checkout for landing/registration pages)
router.post(
  '/counseling/guest-checkout',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').trim().isEmail().withMessage('A valid email address is required.'),
    body('phone').trim().notEmpty().withMessage('WhatsApp number is required.'),
    body('date').isISO8601().withMessage('Booking date must be a valid date in YYYY-MM-DD format.'),
    body('notes').optional().trim(),
  ],
  validateRequest,
  PaymentController.counselingGuestCheckout
);

// POST /api/payments/counseling/verify - Public (Verifies signature and books appointment)
router.post(
  '/counseling/verify',
  [
    body('razorpay_order_id').trim().notEmpty().withMessage('razorpay_order_id is required.'),
    body('razorpay_payment_id').trim().notEmpty().withMessage('razorpay_payment_id is required.'),
    body('razorpay_signature').trim().notEmpty().withMessage('razorpay_signature is required.'),
    body('appointment_date').isISO8601().withMessage('appointment_date must be a valid date in YYYY-MM-DD format.'),
    body('appointment_notes').optional().trim(),
  ],
  validateRequest,
  PaymentController.verifyCounselingPayment
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
