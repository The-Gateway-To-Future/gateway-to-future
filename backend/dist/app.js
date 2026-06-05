"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const rate_limit_middleware_1 = require("./middleware/rate-limit.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
// Security HTTP headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://api.fontshare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://api.fontshare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://api.fontshare.com", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://gatewaytofuture.com"],
            frameSrc: ["'self'", "https://www.youtube.com"],
        },
    },
}));
// Cross-Origin Resource Sharing (CORS) setup
app.use((0, cors_1.default)());
// Express json parser with raw body retention for webhook verification
app.use(express_1.default.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Apply rate limiting to all API requests
app.use('/api', rate_limit_middleware_1.apiLimiter);
// API routes entry point
app.use('/api', routes_1.default);
// Serve Premium Front-End Client Static Files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Fallback routing to index.html for Single Page Application behavior
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/index.html'));
});
// Centralized error handling
app.use(error_middleware_1.errorHandler);
exports.default = app;
