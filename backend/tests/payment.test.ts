import request from 'supertest';
import app from '../src/app';
import { CourseRepository } from '../src/repositories/course.repository';
import { UserRepository } from '../src/repositories/user.repository';
import { PaymentRepository } from '../src/repositories/payment.repository';

describe('Razorpay Payments API Tests', () => {
  let studentToken: string;
  let bookingId: string;

  beforeEach(async () => {
    await CourseRepository.clearMockData();
    await UserRepository.clearMockData();
    await PaymentRepository.clearMockData();

    // Register Student
    const student = await request(app).post('/api/auth/register').send({
      name: 'Student User',
      email: 'student@example.com',
      password: 'Password123!',
      preferred_field: 'Nursing',
    });
    studentToken = student.body.token;

    // Create Booking
    const bookingRes = await request(app)
      .post('/api/courses/course-b1-german/book')
      .set('Authorization', `Bearer ${studentToken}`);
    bookingId = bookingRes.body.booking.id;
  });

  it('should initialize a payment order via checkout', async () => {
    const res = await request(app)
      .post('/api/payments/checkout')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookingId });

    expect(res.status).toBe(211);
    expect(res.body).toHaveProperty('razorpay_order');
    expect(res.body.razorpay_order.amount).toBe(1800000); // 18,000 INR in paise
    expect(res.body.razorpay_order.status).toBe('created');
  });

  it('should verify payment signature and confirm booking registration', async () => {
    // 1. Initiate checkout to create order
    const checkoutRes = await request(app)
      .post('/api/payments/checkout')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookingId });
    const orderId = checkoutRes.body.razorpay_order.id;

    // 2. Client verify request (mock client signature check)
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: 'pay_MOCK_123',
        razorpay_signature: 'mock_client_sig_xyz',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.payment.status).toBe('successful');

    // 3. Confirm booking status updated to confirmed and paid
    const updatedBooking = await PaymentRepository.findBookingById(bookingId);
    expect(updatedBooking?.status).toBe('confirmed');
    expect(updatedBooking?.payment_status).toBe('paid');
  });

  it('should handle Razorpay webhook callbacks to mark payments successful', async () => {
    // 1. Create order
    const checkoutRes = await request(app)
      .post('/api/payments/checkout')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookingId });
    const orderId = checkoutRes.body.razorpay_order.id;

    // 2. Webhook payload
    const webhookPayload = {
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: orderId,
            amount: 1800000,
            status: 'paid',
          },
        },
        payment: {
          entity: {
            id: 'pay_MOCK_WEBHOOK_123',
            order_id: orderId,
            status: 'captured',
          },
        },
      },
    };

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', 'mock_sig_webhook_secret_789')
      .send(webhookPayload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    // 3. Verify database booking state updated asynchronously
    const updatedBooking = await PaymentRepository.findBookingById(bookingId);
    expect(updatedBooking?.status).toBe('confirmed');
    expect(updatedBooking?.payment_status).toBe('paid');
  });
});
