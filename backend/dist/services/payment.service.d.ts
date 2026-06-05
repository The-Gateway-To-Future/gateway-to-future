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
export declare class PaymentService {
    /**
     * Creates a new Razorpay order
     */
    static createOrder(amount: number, // in paise (e.g. 50000 for INR 500.00)
    currency: string | undefined, receipt: string): Promise<RazorpayOrder>;
    /**
     * Verifies Razorpay Webhook Signature
     * Highly secure comparison using timingSafeEqual to prevent timing attacks
     */
    static verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean;
    /**
     * Verifies Client payment parameters after success
     */
    static verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
}
