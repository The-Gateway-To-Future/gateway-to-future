"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const course_routes_1 = __importDefault(require("./course.routes"));
const appointment_routes_1 = __importDefault(require("./appointment.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const material_routes_1 = __importDefault(require("./material.routes"));
const router = (0, express_1.Router)();
// Mount modules
router.use('/auth', auth_routes_1.default);
router.use('/courses', course_routes_1.default);
router.use('/appointments', appointment_routes_1.default);
router.use('/payments', payment_routes_1.default);
router.use('/materials', material_routes_1.default);
exports.default = router;
