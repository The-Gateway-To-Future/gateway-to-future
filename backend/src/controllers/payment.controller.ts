import { Request, Response } from 'express';
import { PaymentRepository } from '../repositories/payment.repository';
import { CourseRepository } from '../repositories/course.repository';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { UserRepository } from '../repositories/user.repository';
import { TimezoneService } from '../services/timezone.service';
import { PaymentService } from '../services/payment.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import crypto from 'crypto';

export class PaymentController {
  static async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { bookingId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized action.' });
      return;
    }

    try {
      const booking = await PaymentRepository.findBookingById(bookingId);
      if (!booking) {
        res.status(404).json({ message: 'Booking not found.' });
        return;
      }

      if (booking.user_id !== userId) {
        res.status(403).json({ message: 'You do not own this booking.' });
        return;
      }

      if (booking.payment_status === 'paid') {
        res.status(400).json({ message: 'This booking has already been paid for.' });
        return;
      }

      // Check course details to get price
      const course = await CourseRepository.findById(booking.course_id);
      if (!course) {
        res.status(404).json({ message: 'Associated course not found.' });
        return;
      }

      // Amount in paise (1 INR = 100 paise)
      const amountInPaise = Math.round(course.price * 100);

      // Create Razorpay Order
      const rzpOrder = await PaymentService.createOrder(
        amountInPaise,
        'INR',
        `receipt_booking_${booking.id.substring(0, 8)}`
      );

      // Log pending payment record
      await PaymentRepository.createPayment({
        user_id: userId,
        booking_id: booking.id,
        amount: course.price,
        currency: 'INR',
        status: 'pending',
        razorpay_order_id: rzpOrder.id,
      });

      res.status(211).json({
        message: 'Order created. Complete payment via Razorpay checkout.',
        razorpay_order: rzpOrder,
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Checkout initialization failed.', error: err.message });
    }
  }

  static async counselingCheckout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { date, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized action.' });
      return;
    }

    try {
      // 1. Verify slot availability
      const slotInfo = TimezoneService.getSlotDetails(date);
      if (!slotInfo.isValid) {
        res.status(400).json({ message: 'Requested date is invalid or falls in the past.' });
        return;
      }

      const existingDateBookings = await AppointmentRepository.findByDate(date);
      if (existingDateBookings.length > 0) {
        res.status(400).json({ message: 'The daily counseling slot for this date is already booked.' });
        return;
      }

      // 2. Create Razorpay order (₹499 = 49900 paise)
      const amountInPaise = 49900;
      const rzpOrder = await PaymentService.createOrder(
        amountInPaise,
        'INR',
        `receipt_counseling_${userId.substring(0, 8)}`,
        {
          type: 'counseling',
          appointment_date: date,
          appointment_notes: notes || '',
          student_id: userId,
          time_slot: slotInfo.formattedSlot
        }
      );

      // 3. Log pending payment record (booking_id is null/omitted)
      await PaymentRepository.createPayment({
        user_id: userId,
        amount: 499.00,
        currency: 'INR',
        status: 'pending',
        razorpay_order_id: rzpOrder.id,
      });

      res.status(211).json({
        message: 'Counseling payment order created.',
        razorpay_order: rzpOrder,
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Counseling checkout failed.', error: err.message });
    }
  }

  static async counselingGuestCheckout(req: Request, res: Response): Promise<void> {
    const { name, email, phone, date, notes } = req.body;

    try {
      // 1. Verify slot availability
      const slotInfo = TimezoneService.getSlotDetails(date);
      if (!slotInfo.isValid) {
        res.status(400).json({ message: 'Requested date is invalid or falls in the past.' });
        return;
      }

      const existingDateBookings = await AppointmentRepository.findByDate(date);
      if (existingDateBookings.length > 0) {
        res.status(400).json({ message: 'The daily counseling slot for this date is already booked.' });
        return;
      }

      // 2. Auto-find or create the student account
      let user = await UserRepository.findByEmail(email);
      let token = '';
      if (!user) {
        const randomPassword = crypto.randomUUID();
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(randomPassword, salt);

        user = await UserRepository.create({
          name,
          email,
          password_hash,
          phone,
          role: 'student',
          qualification: 'Lead Registration Page',
          preferred_field: 'Not Specified',
        });
      }

      // Generate a JWT token for the user so their frontend session can be established
      token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      // 3. Create Razorpay order (₹499)
      const amountInPaise = 49900;
      const rzpOrder = await PaymentService.createOrder(
        amountInPaise,
        'INR',
        `receipt_counseling_guest_${user.id.substring(0, 8)}`,
        {
          type: 'counseling',
          appointment_date: date,
          appointment_notes: notes || '',
          student_id: user.id,
          time_slot: slotInfo.formattedSlot
        }
      );

      // 4. Log pending payment record
      await PaymentRepository.createPayment({
        user_id: user.id,
        amount: 499.00,
        currency: 'INR',
        status: 'pending',
        razorpay_order_id: rzpOrder.id,
      });

      res.status(211).json({
        message: 'Guest counseling payment order created.',
        razorpay_order: rzpOrder,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Guest counseling checkout failed.', error: err.message });
    }
  }

  static async verifyCounselingPayment(req: Request, res: Response): Promise<void> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment_date, appointment_notes } = req.body;

    try {
      const isSignatureValid = PaymentService.verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isSignatureValid) {
        res.status(400).json({ status: 'fail', message: 'Invalid payment signature. Fraud detected.' });
        return;
      }

      // Update payment record to successful
      const payment = await PaymentRepository.updatePaymentSuccess(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!payment) {
        res.status(404).json({ message: 'Payment transaction record not found.' });
        return;
      }

      // Create the counseling appointment
      const slotInfo = TimezoneService.getSlotDetails(appointment_date);
      const timeSlot = slotInfo.isValid ? slotInfo.formattedSlot : '9:00 PM IST / 5:30 PM CEST';

      const existing = await AppointmentRepository.findByStudentAndDate(payment.user_id, appointment_date);
      let appointment = null;
      if (!existing) {
        appointment = await AppointmentRepository.create({
          student_id: payment.user_id,
          appointment_date: appointment_date,
          time_slot: timeSlot,
          status: 'scheduled',
          notes: appointment_notes || 'Premium counseling strategy session.',
        });
      } else {
        appointment = existing;
      }

      res.status(200).json({
        status: 'success',
        message: 'Payment verified and counseling appointment scheduled successfully.',
        payment,
        appointment,
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Payment verification failed.', error: err.message });
    }
  }

  static async verifyClientPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
      const isSignatureValid = PaymentService.verifyPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isSignatureValid) {
        res.status(400).json({ status: 'fail', message: 'Invalid payment signature. Fraud detected.' });
        return;
      }

      // Update payment record to successful and confirm booking
      const payment = await PaymentRepository.updatePaymentSuccess(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!payment) {
        res.status(404).json({ message: 'Payment transaction record not found.' });
        return;
      }

      // Increment course enrolled count
      if (payment.booking_id) {
        const booking = await PaymentRepository.findBookingById(payment.booking_id);
        if (booking) {
          await CourseRepository.incrementEnrollment(booking.course_id);
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Payment verified and course registration completed successfully.',
        payment,
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Payment verification failed.', error: err.message });
    }
  }

  static async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature) {
      res.status(400).json({ message: 'Missing Razorpay signature header.' });
      return;
    }

    try {
      const isSignatureValid = PaymentService.verifyWebhookSignature(rawBody, signature);
      if (!isSignatureValid) {
        res.status(400).json({ message: 'Invalid webhook signature.' });
        return;
      }

      const event = req.body;
      console.log(`[RAZORPAY WEBHOOK] Received event: ${event.event}`);

      // Handle order.paid or payment.captured
      if (event.event === 'order.paid' || event.event === 'payment.captured') {
        const payload = event.payload.payment?.entity || event.payload.order?.entity;
        const orderId = payload.order_id;
        const paymentId = payload.id;
        const signatureMock = `webhook_sig_${crypto.randomUUID()}`;

        if (orderId) {
          const payment = await PaymentRepository.findPaymentByOrderId(orderId);
          if (payment && payment.status === 'pending') {
            await PaymentRepository.updatePaymentSuccess(orderId, paymentId, signatureMock);
            
            // Increment enrollment
            if (payment.booking_id) {
              const booking = await PaymentRepository.findBookingById(payment.booking_id);
              if (booking) {
                await CourseRepository.incrementEnrollment(booking.course_id);
              }
            } else {
              // Create counseling appointment from webhook details
              const notes = payload.notes || {};
              const appointmentDate = notes.appointment_date;
              const appointmentNotes = notes.appointment_notes || '';
              const studentId = notes.student_id || payment.user_id;
              
              if (appointmentDate) {
                const existing = await AppointmentRepository.findByStudentAndDate(studentId, appointmentDate);
                if (!existing) {
                  await AppointmentRepository.create({
                    student_id: studentId,
                    appointment_date: appointmentDate,
                    time_slot: notes.time_slot || '9:00 PM IST / 5:30 PM CEST',
                    status: 'scheduled',
                    notes: appointmentNotes || 'Premium counseling session (confirmed via webhook).',
                  });
                }
              }
            }
            console.log(`[RAZORPAY WEBHOOK] Payment updated to successful for order: ${orderId}`);
          }
        }
      }

      // Always return 200 OK to Razorpay to prevent retries
      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('Razorpay Webhook Error:', err);
      res.status(500).json({ message: 'Internal processing error.', error: err.message });
    }
  }
}
