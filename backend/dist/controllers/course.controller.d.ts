import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
export declare class CourseController {
    static getCourses(req: Request, res: Response): Promise<void>;
    static createCourse(req: AuthenticatedRequest, res: Response): Promise<void>;
    static bookCourse(req: AuthenticatedRequest, res: Response): Promise<void>;
    static getMyBookings(req: AuthenticatedRequest, res: Response): Promise<void>;
}
