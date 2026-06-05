"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const material_controller_1 = require("../controllers/material.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/materials - Logged-in students or admins
router.get('/', auth_middleware_1.authenticateJWT, material_controller_1.MaterialController.getMaterials);
// POST /api/materials - Admin only (Register educational material)
router.post('/', auth_middleware_1.authenticateJWT, auth_middleware_1.requireAdmin, [
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Resource title is required.'),
    (0, express_validator_1.body)('description').trim().notEmpty().withMessage('Description is required.'),
    (0, express_validator_1.body)('type').isIn(['PDF', 'VIDEO']).withMessage('Type must be either PDF or VIDEO.'),
    (0, express_validator_1.body)('url').isURL().withMessage('Must be a valid resource URL link.'),
    (0, express_validator_1.body)('level').isIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'ALL']).withMessage('Invalid German level boundary.'),
], validation_middleware_1.validateRequest, material_controller_1.MaterialController.createMaterial);
exports.default = router;
