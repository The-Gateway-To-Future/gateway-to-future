import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').trim().isEmail().withMessage('Must be a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('phone').optional().trim().notEmpty().withMessage('Phone number cannot be empty if provided.'),
    body('qualification').optional().trim().notEmpty().withMessage('Qualification cannot be empty if provided.'),
    body('preferred_field').optional().trim().notEmpty().withMessage('Preferred field cannot be empty if provided.'),
  ],
  validateRequest,
  AuthController.register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Must be a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validateRequest,
  AuthController.login
);

// GET /api/auth/me
router.get('/me', authenticateJWT, AuthController.me);

export default router;
