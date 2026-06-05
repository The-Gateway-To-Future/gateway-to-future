import { Router } from 'express';
import { body, query } from 'express-validator';
import { AppointmentController } from '../controllers/appointment.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateJWT, requireStudent } from '../middleware/auth.middleware';

const router = Router();

// GET /api/appointments/available-slots - Public / Logged in
router.get(
  '/available-slots',
  [
    query('date').isISO8601().withMessage('Date must be a valid date in YYYY-MM-DD format.'),
  ],
  validateRequest,
  AppointmentController.getAvailableSlots
);

// POST /api/appointments/book - Student only
router.post(
  '/book',
  authenticateJWT,
  requireStudent,
  [
    body('date').isISO8601().withMessage('Booking date must be a valid date in YYYY-MM-DD format.'),
    body('notes').optional().trim(),
  ],
  validateRequest,
  AppointmentController.bookAppointment
);

// GET /api/appointments/my-appointments - Student only
router.get('/my-appointments', authenticateJWT, requireStudent, AppointmentController.getMyAppointments);

export default router;
