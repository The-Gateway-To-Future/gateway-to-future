import request from 'supertest';
import app from '../src/app';
import { CourseRepository } from '../src/repositories/course.repository';
import { UserRepository } from '../src/repositories/user.repository';
import { PaymentRepository } from '../src/repositories/payment.repository';
import { CacheService } from '../src/services/cache.service';

describe('Courses and Booking API Tests', () => {
  let studentToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await CourseRepository.clearMockData();
    await UserRepository.clearMockData();
    await PaymentRepository.clearMockData();
    await CacheService.del('courses:all');

    // Register Student
    const student = await request(app).post('/api/auth/register').send({
      name: 'Student User',
      email: 'student@example.com',
      password: 'Password123!',
      preferred_field: 'Nursing',
    });
    studentToken = student.body.token;

    // Register Admin (email matches admin seeding criteria)
    const admin = await request(app).post('/api/auth/register').send({
      name: 'Admin User',
      email: 'admin@gatewaytofuture.com', // triggers admin role in seeding
      password: 'Password123!',
    });
    adminToken = admin.body.token;
  });

  it('should retrieve a list of all courses', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('courses');
    expect(res.body.courses.length).toBeGreaterThan(0);
  });

  it('should allow admin to create a new language course', async () => {
    const newCourse = {
      title: 'German C1 Academic',
      description: 'Advanced German language track.',
      level: 'C1',
      price: 25000.00,
      capacity: 15,
      start_date: '2026-07-01',
      end_date: '2026-09-30',
    };

    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newCourse);

    expect(res.status).toBe(211);
    expect(res.body.course.title).toBe(newCourse.title);
    expect(res.body.course.level).toBe(newCourse.level);
  });

  it('should prevent student from creating a course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Unauthorized Course',
        description: 'Blah',
        level: 'B1',
        price: 100,
        capacity: 10,
        start_date: '2026-07-01',
        end_date: '2026-09-30',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Insufficient privileges');
  });

  it('should allow a student to book a language course', async () => {
    const res = await request(app)
      .post('/api/courses/course-b1-german/book')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(211);
    expect(res.body.booking.course_id).toBe('course-b1-german');
    expect(res.body.booking.status).toBe('pending');
    expect(res.body.booking.payment_status).toBe('unpaid');
  });

  it('should prevent a student from booking the same course twice', async () => {
    // First booking
    await request(app)
      .post('/api/courses/course-b1-german/book')
      .set('Authorization', `Bearer ${studentToken}`);

    // Second booking
    const res = await request(app)
      .post('/api/courses/course-b1-german/book')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already booked');
  });
});
