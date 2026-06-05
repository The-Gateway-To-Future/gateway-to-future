import request from 'supertest';
import app from '../src/app';
import { MaterialRepository } from '../src/repositories/material.repository';
import { UserRepository } from '../src/repositories/user.repository';
import { CacheService } from '../src/services/cache.service';

describe('Educational Materials API Tests', () => {
  let studentToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await MaterialRepository.clearMockData();
    await UserRepository.clearMockData();
    
    // Clear caches
    await CacheService.del('materials:student:ALL');
    await CacheService.del('materials:student:B1');
    await CacheService.del('materials:admin:admin');

    // Register Student
    const student = await request(app).post('/api/auth/register').send({
      name: 'Student User',
      email: 'student@example.com',
      password: 'Password123!',
      preferred_field: 'Nursing',
    });
    studentToken = student.body.token;

    // Register Admin
    const admin = await request(app).post('/api/auth/register').send({
      name: 'Admin User',
      email: 'admin@gatewaytofuture.com',
      password: 'Password123!',
    });
    adminToken = admin.body.token;
  });

  it('should list all materials matching student boundaries (level ALL)', async () => {
    const res = await request(app)
      .get('/api/materials?level=ALL')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('materials');
    // Default seeded list contains 'ALL' items (Ausbildung guide, CV template)
    const hasAusbildungGuide = res.body.materials.some((m: any) => m.id === 'material-ausbildung-guide');
    expect(hasAusbildungGuide).toBe(true);
  });

  it('should filter materials by level (level B1)', async () => {
    const res = await request(app)
      .get('/api/materials?level=B1')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    // B1 query returns 'ALL' (visa, cv, guide) plus specific 'B1' mock interview video
    const hasB1Video = res.body.materials.some((m: any) => m.id === 'material-b1-video');
    expect(hasB1Video).toBe(true);
  });

  it('should allow admin to upload a new resource and invalidate caches', async () => {
    const newMaterial = {
      title: 'German A2 Verb Conjunctions PDF',
      description: 'Handout covering A2 grammar rules.',
      type: 'PDF',
      url: 'https://gatewaytofuture.com/resources/A2_German_Grammar.pdf',
      level: 'A2',
    };

    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newMaterial);

    expect(res.status).toBe(211);
    expect(res.body.material.title).toBe(newMaterial.title);
  });

  it('should block non-admin from uploading resources', async () => {
    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Hacked Material',
        description: 'Hacked',
        type: 'PDF',
        url: 'http://hacked.com/pdf',
        level: 'ALL',
      });

    expect(res.status).toBe(403);
  });
});
