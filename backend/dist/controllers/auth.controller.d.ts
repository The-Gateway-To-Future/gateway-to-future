import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
export declare class AuthController {
    static register(req: Request, res: Response): Promise<void>;
    static login(req: Request, res: Response): Promise<void>;
    static me(req: AuthenticatedRequest, res: Response): Promise<void>;
}
