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
export declare class PaymentRepository {
    static createBooking(userId: string, courseId: string): Promise<Booking>;
    static findBookingById(id: string): Promise<Booking | null>;
    static findBookingsByUser(userId: string): Promise<Booking[]>;
    static updateBookingStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled', paymentStatus: 'unpaid' | 'paid'): Promise<boolean>;
    static createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment>;
    static findPaymentByOrderId(orderId: string): Promise<Payment | null>;
    static updatePaymentSuccess(orderId: string, paymentId: string, signature: string): Promise<Payment | null>;
    static clearMockData(): Promise<void>;
}
