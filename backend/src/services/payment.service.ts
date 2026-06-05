import crypto from 'crypto';
import { env } from '../config/env';

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: any[];
  created_at: number;
}

export class PaymentService {
  /**
   * Creates a new Razorpay order
   */
  static async createOrder(
    amount: number, // in paise (e.g. 50000 for INR 500.00)
    currency: string = 'INR',
    receipt: string
  ): Promise<RazorpayOrder> {
    if (env.PAY_MOCK) {
      console.log(`[MOCK PAYMENT] Simulating Razorpay order creation for INR ${amount / 100}`);
      return {
        id: `order_${crypto.randomBytes(8).toString('hex')}`,
        entity: 'order',
        amount,
        amount_paid: 0,
        amount_due: amount,
        currency,
        receipt,
        status: 'created',
        attempts: 0,
        notes: [],
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    // Production integration using native Node.js fetch (No heavy SDK required!)
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
    
    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Razorpay API Error: ${response.status} - ${errorText}`);
      }

      return (await response.json()) as RazorpayOrder;
    } catch (err: any) {
      console.error('Razorpay order creation failed:', err.message);
      throw new Error(`Payment gateway communication error: ${err.message}`);
    }
  }

  /**
   * Verifies Razorpay Webhook Signature
   * Highly secure comparison using timingSafeEqual to prevent timing attacks
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string = env.RAZORPAY_WEBHOOK_SECRET
  ): boolean {
    if (env.PAY_MOCK && signature.startsWith('mock_sig_')) {
      return true; // Fast path for testing
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const bufferExpected = Buffer.from(expectedSignature, 'utf8');
      const bufferActual = Buffer.from(signature, 'utf8');

      if (bufferExpected.length !== bufferActual.length) {
        return false;
      }

      return crypto.timingSafeEqual(bufferExpected, bufferActual);
    } catch (err) {
      console.error('Webhook signature verification failed with error:', err);
      return false;
    }
  }

  /**
   * Verifies Client payment parameters after success
   */
  static verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    if (env.PAY_MOCK && signature.startsWith('mock_client_sig_')) {
      return true;
    }

    try {
      const text = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');
      
      return expectedSignature === signature;
    } catch {
      return false;
    }
  }
}
