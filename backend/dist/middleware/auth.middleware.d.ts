import { Request, Response, NextFunction } from 'express';
import { User } from '../repositories/user.repository';
export interface AuthenticatedRequest extends Request {
    user?: User;
}
export declare const authenticateJWT: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (roles: ("student" | "admin")[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireStudent: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
