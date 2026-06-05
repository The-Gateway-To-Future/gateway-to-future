import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
export declare class AppointmentController {
    static getAvailableSlots(req: Request, res: Response): Promise<void>;
    static bookAppointment(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getMyAppointments(req: AuthenticatedRequest, res: Response): Promise<void>;
}
