import { db } from '../config/database';
import { env } from '../config/env';
import crypto from 'crypto';

export interface Booking {
  id: string;
  user_id: string;
  course_id: string;
  course_title?: string;
  course_level?: string;
  course_price?: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'unpaid' | 'paid';
  booked_at: Date;
}

export interface Payment {
  id: string;
  user_id: string;
  booking_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'successful' | 'failed';
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  created_at: Date;
  updated_at: Date;
}

// In-Memory states
const mockBookings = new Map<string, Booking>();
const mockPayments = new Map<string, Payment>();

export class PaymentRepository {
  // --- Booking Operations ---
  
  static async createBooking(userId: string, courseId: string): Promise<Booking> {
    if (env.DB_MOCK) {
      const newBooking: Booking = {
        id: crypto.randomUUID(),
        user_id: userId,
        course_id: courseId,
        status: 'pending',
        payment_status: 'unpaid',
        booked_at: new Date(),
      };
      mockBookings.set(newBooking.id, newBooking);
      return { ...newBooking };
    }

    const result = await db.query(
      `INSERT INTO bookings (user_id, course_id, status, payment_status)
       VALUES ($1, $2, 'pending', 'unpaid')
       RETURNING id, user_id, course_id, status, payment_status, booked_at`,
      [userId, courseId]
    );

    const row = result.rows[0];
    return {
      ...row,
      booked_at: new Date(row.booked_at),
    };
  }

  static async findBookingById(id: string): Promise<Booking | null> {
    if (env.DB_MOCK) {
      const booking = mockBookings.get(id);
      return booking ? { ...booking } : null;
    }

    const result = await db.query(
      `SELECT b.id, b.user_id, b.course_id, b.status, b.payment_status, b.booked_at,
              c.title as course_title, c.level as course_level, c.price as course_price
       FROM bookings b
       JOIN courses c ON b.course_id = c.id
       WHERE b.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      course_price: parseFloat(row.course_price),
      booked_at: new Date(row.booked_at),
    };
  }

  static async findBookingsByUser(userId: string): Promise<Booking[]> {
    if (env.DB_MOCK) {
      return Array.from(mockBookings.values())
        .filter(b => b.user_id === userId)
        .map(b => ({ ...b }));
    }

    const result = await db.query(
      `SELECT b.id, b.user_id, b.course_id, b.status, b.payment_status, b.booked_at,
              c.title as course_title, c.level as course_level, c.price as course_price
       FROM bookings b
       JOIN courses c ON b.course_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.booked_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      ...row,
      course_price: parseFloat(row.course_price),
      booked_at: new Date(row.booked_at),
    }));
  }

  static async updateBookingStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'cancelled',
    paymentStatus: 'unpaid' | 'paid'
  ): Promise<boolean> {
    if (env.DB_MOCK) {
      const booking = mockBookings.get(id);
      if (!booking) return false;
      booking.status = status;
      booking.payment_status = paymentStatus;
      return true;
    }

    const result = await db.query(
      `UPDATE bookings 
       SET status = $2, payment_status = $3 
       WHERE id = $1`,
      [id, status, paymentStatus]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // --- Payment Operations ---

  static async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    if (env.DB_MOCK) {
      const newPayment: Payment = {
        ...payment,
        id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPayments.set(newPayment.id, newPayment);
      return { ...newPayment };
    }

    const result = await db.query(
      `INSERT INTO payments (user_id, booking_id, amount, currency, status, razorpay_order_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, booking_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at`,
      [
        payment.user_id,
        payment.booking_id || null,
        payment.amount,
        payment.currency,
        payment.status,
        payment.razorpay_order_id,
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      amount: parseFloat(row.amount),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  static async findPaymentByOrderId(orderId: string): Promise<Payment | null> {
    if (env.DB_MOCK) {
      for (const p of mockPayments.values()) {
        if (p.razorpay_order_id === orderId) {
          return { ...p };
        }
      }
      return null;
    }

    const result = await db.query(
      `SELECT id, user_id, booking_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at 
       FROM payments 
       WHERE razorpay_order_id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      amount: parseFloat(row.amount),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  static async updatePaymentSuccess(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<Payment | null> {
    if (env.DB_MOCK) {
      let foundPayment: Payment | null = null;
      for (const p of mockPayments.values()) {
        if (p.razorpay_order_id === orderId) {
          p.status = 'successful';
          p.razorpay_payment_id = paymentId;
          p.razorpay_signature = signature;
          p.updated_at = new Date();
          foundPayment = { ...p };
          
          // Also update booking status
          if (p.booking_id) {
            this.updateBookingStatus(p.booking_id, 'confirmed', 'paid');
          }
        }
      }
      return foundPayment;
    }

    // Begin Transaction to ensure atoms updating both payment and booking
    await db.query('BEGIN');
    try {
      const result = await db.query(
        `UPDATE payments 
         SET status = 'successful', razorpay_payment_id = $2, razorpay_signature = $3, updated_at = NOW() 
         WHERE razorpay_order_id = $1
         RETURNING id, user_id, booking_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at`,
        [orderId, paymentId, signature]
      );

      if (result.rows.length === 0) {
        await db.query('ROLLBACK');
        return null;
      }

      const payment = result.rows[0];

      if (payment.booking_id) {
        await db.query(
          `UPDATE bookings 
           SET status = 'confirmed', payment_status = 'paid' 
           WHERE id = $1`,
          [payment.booking_id]
        );
      }

      await db.query('COMMIT');
      
      return {
        ...payment,
        amount: parseFloat(payment.amount),
        created_at: new Date(payment.created_at),
        updated_at: new Date(payment.updated_at),
      };
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }

  static async clearMockData(): Promise<void> {
    mockBookings.clear();
    mockPayments.clear();
  }
}
