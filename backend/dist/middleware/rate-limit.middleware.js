"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Standard rate limiter for all API endpoints (max 100 requests per 15 minutes per IP)
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Stricter rate limiter for authentication routes (login/register) to prevent brute-force attacks
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 15, // limit each IP to 15 login/register attempts per hour
    message: {
        message: 'Too many login or registration attempts. Please try again in an hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
