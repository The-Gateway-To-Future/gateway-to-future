"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const payment_controller_1 = require("../controllers/payment.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// POST /api/payments/checkout - Student only (Initiates order)
router.post('/checkout', auth_middleware_1.authenticateJWT, auth_middleware_1.requireStudent, [
    (0, express_validator_1.body)('bookingId').trim().notEmpty().withMessage('bookingId is required.'),
], validation_middleware_1.validateRequest, payment_controller_1.PaymentController.checkout);
// POST /api/payments/verify - Student only (Verifies signature and updates database)
router.post('/verify', auth_middleware_1.authenticateJWT, auth_middleware_1.requireStudent, [
    (0, express_validator_1.body)('razorpay_order_id').trim().notEmpty().withMessage('razorpay_order_id is required.'),
    (0, express_validator_1.body)('razorpay_payment_id').trim().notEmpty().withMessage('razorpay_payment_id is required.'),
    (0, express_validator_1.body)('razorpay_signature').trim().notEmpty().withMessage('razorpay_signature is required.'),
], validation_middleware_1.validateRequest, payment_controller_1.PaymentController.verifyClientPayment);
// POST /api/payments/webhook - Webhook callback from Razorpay (signature verified inside controller via rawBody)
router.post('/webhook', payment_controller_1.PaymentController.webhook);
exports.default = router;
