import { Router } from 'express';
import { body } from 'express-validator';
import { CourseController } from '../controllers/course.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateJWT, requireAdmin, requireStudent } from '../middleware/auth.middleware';

const router = Router();

// GET /api/courses - Public / Logged in (List courses)
router.get('/', CourseController.getCourses);

// POST /api/courses - Admin only (Create course)
router.post(
  '/',
  authenticateJWT,
  requireAdmin,
  [
    body('title').trim().notEmpty().withMessage('Course title is required.'),
    body('description').trim().notEmpty().withMessage('Course description is required.'),
    body('level').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid German course level.'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer.'),
    body('start_date').isISO8601().toDate().withMessage('Start date must be a valid date (YYYY-MM-DD).'),
    body('end_date').isISO8601().toDate().withMessage('End date must be a valid date (YYYY-MM-DD).'),
  ],
  validateRequest,
  CourseController.createCourse
);

// GET /api/courses/my-bookings - Student only (My bookings)
router.get('/my-bookings', authenticateJWT, requireStudent, CourseController.getMyBookings);

// POST /api/courses/:id/book - Student only (Book course)
router.post('/:id/book', authenticateJWT, requireStudent, CourseController.bookCourse);

export default router;
