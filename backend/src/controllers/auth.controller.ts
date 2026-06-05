import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, phone, qualification, preferred_field } = req.body;

    try {
      // Check if user already exists
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        res.status(400).json({ message: 'A user with this email address already exists.' });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Default role to student. First registered user in system can be admin if matches init admin env email
      const role = email.toLowerCase() === env.ADMIN_INIT_EMAIL.toLowerCase() ? 'admin' : 'student';

      const user = await UserRepository.create({
        name,
        email,
        password_hash,
        phone,
        role,
        qualification,
        preferred_field,
      });

      // Sign JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

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
    } catch (err: any) {
      res.status(500).json({ message: 'Error registering user.', error: err.message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    try {
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        res.status(401).json({ message: 'Invalid email or password credentials.' });
        return;
      }

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ message: 'Invalid email or password credentials.' });
        return;
      }

      // Sign JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

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
    } catch (err: any) {
      res.status(500).json({ message: 'Error logging in.', error: err.message });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
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
