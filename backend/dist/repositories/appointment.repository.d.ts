export interface Appointment {
    id: string;
    student_id: string;
    student_name?: string;
    counselor_id?: string;
    appointment_date: string;
    time_slot: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    created_at: Date;
}
export declare class AppointmentRepository {
    static findByStudentAndDate(studentId: string, dateStr: string): Promise<Appointment | null>;
    static findByDate(dateStr: string): Promise<Appointment[]>;
    static findByStudent(studentId: string): Promise<Appointment[]>;
    static create(appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment>;
    static clearMockData(): Promise<void>;
}
