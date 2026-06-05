import { Request, Response } from 'express';
import { PaymentRepository } from '../repositories/payment.repository';
import { CourseRepository } from '../repositories/course.repository';
import { PaymentService } from '../services/payment.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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
import crypto from 'crypto';
