import request from 'supertest';
import app from '../src/app';
import { UserRepository } from '../src/repositories/user.repository';

describe('Authentication API Endpoint Tests', () => {
  beforeEach(async () => {
    await UserRepository.clearMockData();
  });

  const testUser = {
    name: 'Test Student',
    email: 'student@gateway.com',
    password: 'Password123!',
    phone: '+919876543210',
    qualification: 'Higher Secondary School',
    preferred_field: 'Nursing',
  };

  it('should register a new student successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(211);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.role).toBe('student');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('should fail registration if email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'bad-email' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('email');
  });

  it('should authenticate user and return token on login', async () => {
    // Pre-register user
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should reject login with wrong password', async () => {
    await request(app).post('/api/auth/register').send(testUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid email or password');
  });

  it('should retrieve user profile when authenticated', async () => {
    const regRes = await request(app).post('/api/auth/register').send(testUser);
    const token = regRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.name).toBe(testUser.name);
  });

  it('should block profile request if unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
