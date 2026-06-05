"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const appointment_controller_1 = require("../controllers/appointment.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/appointments/available-slots - Public / Logged in
router.get('/available-slots', [
    (0, express_validator_1.query)('date').isISO8601().withMessage('Date must be a valid date in YYYY-MM-DD format.'),
], validation_middleware_1.validateRequest, appointment_controller_1.AppointmentController.getAvailableSlots);
// POST /api/appointments/book - Student only
router.post('/book', auth_middleware_1.authenticateJWT, auth_middleware_1.requireStudent, [
    (0, express_validator_1.body)('date').isISO8601().withMessage('Booking date must be a valid date in YYYY-MM-DD format.'),
    (0, express_validator_1.body)('notes').optional().trim(),
], validation_middleware_1.validateRequest, appointment_controller_1.AppointmentController.bookAppointment);
// GET /api/appointments/my-appointments - Student only
router.get('/my-appointments', auth_middleware_1.authenticateJWT, auth_middleware_1.requireStudent, appointment_controller_1.AppointmentController.getMyAppointments);
exports.default = router;
