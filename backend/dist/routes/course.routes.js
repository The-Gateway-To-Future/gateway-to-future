"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const course_controller_1 = require("../controllers/course.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/courses - Public / Logged in (List courses)
router.get('/', course_controller_1.CourseController.getCourses);
// POST /api/courses - Admin only (Create course)
router.post('/', auth_middleware_1.authenticateJWT, auth_middleware_1.requireAdmin, [
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Course title is required.'),
    (0, express_validator_1.body)('description').trim().notEmpty().withMessage('Course description is required.'),
    (0, express_validator_1.body)('level').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).withMessage('Invalid German course level.'),
    (0, express_validator_1.body)('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
    (0, express_validator_1.body)('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer.'),
    (0, express_validator_1.body)('start_date').isISO8601().toDate().withMessage('Start date must be a valid date (YYYY-MM-DD).'),
    (0, express_validator_1.body)('end_date').isISO8601().toDate().withMessage('End date must be a valid date (YYYY-MM-DD).'),
], validation_middleware_1.validateRequest, course_controller_1.CourseController.createCourse);
// GET /api/courses/my-bookings - Student only (My bookings)
router.get('/my-bookings', auth_middleware_1.authenticateJWT, auth_middleware_1.requireStudent, course_controller_1.CourseController.getMyBookings);
// POST /api/courses/:id/book - Student only (Book course)
router.post('/:id/book', auth_middleware_1.authenticateJWT, auth_middleware_1.requireStudent, course_controller_1.CourseController.bookCourse);
exports.default = router;
