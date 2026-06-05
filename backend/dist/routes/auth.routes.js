"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const router = (0, express_1.Router)();
// POST /api/auth/register
router.post('/register', rate_limit_middleware_1.authLimiter, [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required.'),
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Must be a valid email address.').normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    (0, express_validator_1.body)('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty if provided.'),
    (0, express_validator_1.body)('qualification').optional().trim().notEmpty().withMessage('Qualification cannot be empty if provided.'),
    (0, express_validator_1.body)('preferred_field').optional().trim().notEmpty().withMessage('Preferred field cannot be empty if provided.'),
], validation_middleware_1.validateRequest, auth_controller_1.AuthController.register);
// POST /api/auth/login
router.post('/login', rate_limit_middleware_1.authLimiter, [
    (0, express_validator_1.body)('email').trim().isEmail().withMessage('Must be a valid email address.').normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required.'),
], validation_middleware_1.validateRequest, auth_controller_1.AuthController.login);
// GET /api/auth/me
router.get('/me', auth_middleware_1.authenticateJWT, auth_controller_1.AuthController.me);
exports.default = router;
