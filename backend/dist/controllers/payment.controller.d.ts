import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
export declare class PaymentController {
    static checkout(req: AuthenticatedRequest, res: Response): Promise<void>;
    static verifyClientPayment(req: AuthenticatedRequest, res: Response): Promise<void>;
    static webhook(req: Request, res: Response): Promise<void>;
}
