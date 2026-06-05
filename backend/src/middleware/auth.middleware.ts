import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRepository, User } from '../repositories/user.repository';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication token missing or invalid. Access Denied.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: string };
    const user = await UserRepository.findById(decoded.id);

    if (!user) {
      res.status(401).json({ message: 'User associated with token no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(403).json({ message: 'Session expired or token signature invalid.', error: err.message });
  }
};

export const requireRole = (roles: ('student' | 'admin')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient privileges. Access Forbidden.' });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireStudent = requireRole(['student']);
