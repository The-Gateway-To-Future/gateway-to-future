import { Router } from 'express';
import { body } from 'express-validator';
import { MaterialController } from '../controllers/material.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateJWT, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// GET /api/materials - Logged-in students or admins
router.get('/', authenticateJWT, MaterialController.getMaterials);

// POST /api/materials - Admin only (Register educational material)
router.post(
  '/',
  authenticateJWT,
  requireAdmin,
  [
    body('title').trim().notEmpty().withMessage('Resource title is required.'),
    body('description').trim().notEmpty().withMessage('Description is required.'),
    body('type').isIn(['PDF', 'VIDEO']).withMessage('Type must be either PDF or VIDEO.'),
    body('url').isURL().withMessage('Must be a valid resource URL link.'),
    body('level').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'ALL']).withMessage('Invalid German level boundary.'),
  ],
  validateRequest,
  MaterialController.createMaterial
);

export default router;
