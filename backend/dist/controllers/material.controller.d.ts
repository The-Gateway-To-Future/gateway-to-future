import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
export declare class MaterialController {
    static getMaterials(req: AuthenticatedRequest, res: Response): Promise<void>;
    static createMaterial(req: AuthenticatedRequest, res: Response): Promise<void>;
}
