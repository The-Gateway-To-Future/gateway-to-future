"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialController = void 0;
const material_repository_1 = require("../repositories/material.repository");
const cache_service_1 = require("../services/cache.service");
class MaterialController {
    static async getMaterials(req, res) {
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
        const levelQuery = req.query.level;
        const targetLevel = isStudent ? (levelQuery || 'ALL') : 'admin';
        const cacheKey = `materials:${user.role}:${targetLevel}`;
        try {
            // 1. Try reading from cache
            const cachedData = await cache_service_1.CacheService.get(cacheKey);
            if (cachedData) {
                res.status(200).json({ materials: cachedData, cached: true });
                return;
            }
            // 2. Fetch from repository
            const materials = await material_repository_1.MaterialRepository.findAll(targetLevel);
            // 3. Cache for 30 minutes
            await cache_service_1.CacheService.set(cacheKey, materials, 1800);
            res.status(200).json({ materials, cached: false });
        }
        catch (err) {
            res.status(500).json({ message: 'Error retrieving educational materials.', error: err.message });
        }
    }
    static async createMaterial(req, res) {
        const { title, description, type, url, level } = req.body;
        const adminId = req.user?.id;
        try {
            const material = await material_repository_1.MaterialRepository.create({
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
            await cache_service_1.CacheService.del('materials:student:ALL');
            await cache_service_1.CacheService.del('materials:student:A1');
            await cache_service_1.CacheService.del('materials:student:A2');
            await cache_service_1.CacheService.del('materials:student:B1');
            await cache_service_1.CacheService.del('materials:student:B2');
            await cache_service_1.CacheService.del('materials:student:C1');
            await cache_service_1.CacheService.del('materials:student:C2');
            await cache_service_1.CacheService.del('materials:admin:admin');
            res.status(211).json({ message: 'Educational material registered successfully.', material });
        }
        catch (err) {
            res.status(500).json({ message: 'Error registering material.', error: err.message });
        }
    }
}
exports.MaterialController = MaterialController;
