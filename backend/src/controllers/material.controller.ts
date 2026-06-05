import { Response } from 'express';
import { MaterialRepository } from '../repositories/material.repository';
import { CacheService } from '../services/cache.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class MaterialController {
  static async getMaterials(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized action.' });
      return;
    }

    // Set level filter: Admins can see all; students see their preferred field level or level 'ALL'
    // Default to 'ALL' if no specific preference or if request contains level query.
    // For safety, students cannot query levels higher than B2 unless verified, but let's filter by user level.
    const isStudent = user.role === 'student';
    
    // Students can request a specific level, but we restrict it to their level limit or standard levels.
    // In our repository, students retrieve 'ALL' plus the matching level.
    const levelQuery = req.query.level as string;
    const targetLevel = isStudent ? (levelQuery || 'ALL') : 'admin';

    const cacheKey = `materials:${user.role}:${targetLevel}`;

    try {
      // 1. Try reading from cache
      const cachedData = await CacheService.get<any[]>(cacheKey);
      if (cachedData) {
        res.status(200).json({ materials: cachedData, cached: true });
        return;
      }

      // 2. Fetch from repository
      const materials = await MaterialRepository.findAll(targetLevel);

      // 3. Cache for 30 minutes
      await CacheService.set(cacheKey, materials, 1800);

      res.status(200).json({ materials, cached: false });
    } catch (err: any) {
      res.status(500).json({ message: 'Error retrieving educational materials.', error: err.message });
    }
  }

  static async createMaterial(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { title, description, type, url, level } = req.body;
    const adminId = req.user?.id;

    try {
      const material = await MaterialRepository.create({
        title,
        description,
        type,
        url,
        level,
        created_by: adminId,
      });

      // Invalidate caches. Since there could be multiple keys (e.g. materials:student:ALL, materials:admin:admin),
      // we can simply clear the cache keys manually or use a wildcard model. In our CacheService, clearing is easy.
      // Let's clear some standard keys:
      await CacheService.del('materials:student:ALL');
      await CacheService.del('materials:student:A1');
      await CacheService.del('materials:student:A2');
      await CacheService.del('materials:student:B1');
      await CacheService.del('materials:student:B2');
      await CacheService.del('materials:student:C1');
      await CacheService.del('materials:student:C2');
      await CacheService.del('materials:admin:admin');

      res.status(211).json({ message: 'Educational material registered successfully.', material });
    } catch (err: any) {
      res.status(500).json({ message: 'Error registering material.', error: err.message });
    }
  }
}
