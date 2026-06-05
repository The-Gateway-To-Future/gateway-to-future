"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const user_repository_1 = require("../repositories/user.repository");
class AuthController {
    static async register(req, res) {
        const { name, email, password, phone, qualification, preferred_field } = req.body;
        try {
            // Check if user already exists
            const existingUser = await user_repository_1.UserRepository.findByEmail(email);
            if (existingUser) {
                res.status(400).json({ message: 'A user with this email address already exists.' });
                return;
            }
            // Hash password
            const salt = await bcryptjs_1.default.genSalt(10);
            const password_hash = await bcryptjs_1.default.hash(password, salt);
            // Default role to student. First registered user in system can be admin if matches init admin env email
            const role = email.toLowerCase() === env_1.env.ADMIN_INIT_EMAIL.toLowerCase() ? 'admin' : 'student';
            const user = await user_repository_1.UserRepository.create({
                name,
                email,
                password_hash,
                phone,
                role,
                qualification,
                preferred_field,
            });
            // Sign JWT
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
            res.status(211).json({
                message: 'Registration successful.',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    qualification: user.qualification,
                    preferred_field: user.preferred_field,
                },
            });
        }
        catch (err) {
            res.status(500).json({ message: 'Error registering user.', error: err.message });
        }
    }
    static async login(req, res) {
        const { email, password } = req.body;
        try {
            const user = await user_repository_1.UserRepository.findByEmail(email);
            if (!user) {
                res.status(401).json({ message: 'Invalid email or password credentials.' });
                return;
            }
            // Compare passwords
            const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isMatch) {
                res.status(401).json({ message: 'Invalid email or password credentials.' });
                return;
            }
            // Sign JWT
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, env_1.env.JWT_SECRET, { expiresIn: env_1.env.JWT_EXPIRES_IN });
            res.status(200).json({
                message: 'Login successful.',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    qualification: user.qualification,
                    preferred_field: user.preferred_field,
                },
            });
        }
        catch (err) {
            res.status(500).json({ message: 'Error logging in.', error: err.message });
        }
    }
    static async me(req, res) {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized profile request.' });
            return;
        }
        res.status(200).json({
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                phone: req.user.phone,
                qualification: req.user.qualification,
                preferred_field: req.user.preferred_field,
            },
        });
    }
}
exports.AuthController = AuthController;
