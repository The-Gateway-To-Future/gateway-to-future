import request from 'supertest';
import app from '../src/app';
import { AppointmentRepository } from '../src/repositories/appointment.repository';
import { UserRepository } from '../src/repositories/user.repository';

describe('Appointments and Counseling Slots API Tests', () => {
  let studentToken: string;
  let otherStudentToken: string;
  const testDate = '2026-06-15'; // Specific date in the future

  beforeEach(async () => {
    await AppointmentRepository.clearMockData();
    await UserRepository.clearMockData();

    // Register Student 1
    const student1 = await request(app).post('/api/auth/register').send({
      name: 'Student One',
      email: 'student1@example.com',
      password: 'Password123!',
      preferred_field: 'Nursing',
    });
    studentToken = student1.body.token;

    // Register Student 2
    const student2 = await request(app).post('/api/auth/register').send({
      name: 'Student Two',
      email: 'student2@example.com',
      password: 'Password123!',
      preferred_field: 'IT Specialist',
    });
    otherStudentToken = student2.body.token;
  });

  it('should query slot details and confirm availability', async () => {
    const res = await request(app)
      .get(`/api/appointments/available-slots?date=${testDate}`);

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(testDate);
    expect(res.body.available).toBe(true);
    expect(res.body.slot).toContain('9:00 PM IST');
  });

  it('should allow student to book the daily slot', async () => {
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        date: testDate,
        notes: 'Ausbildung nursing interview preparation request.',
      });

    expect(res.status).toBe(211);
    expect(res.body.appointment.appointment_date).toBe(testDate);
    expect(res.body.appointment.status).toBe('scheduled');
  });

  it('should prevent double booking of the single daily slot', async () => {
    // Student 1 books the slot
    await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ date: testDate });

    // Student 2 tries to book the slot on the same date
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${otherStudentToken}`)
      .send({ date: testDate });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already booked');
  });

  it('should prevent a single student from booking two slots on the same date', async () => {
    // Book slot 1 (succeeds)
    await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ date: testDate });

    // Try booking again on the same date (fails due to unique constraint validation)
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ date: testDate });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already have a counseling session');
  });

  it('should block bookings in the past', async () => {
    const pastDate = '2020-01-01';
    const res = await request(app)
      .post('/api/appointments/book')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ date: pastDate });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('invalid or falls in the past');
  });
});
