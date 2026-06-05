export interface Course {
    id: string;
    title: string;
    description: string;
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    price: number;
    capacity: number;
    enrolled_count: number;
    start_date: Date;
    end_date: Date;
    created_at: Date;
}
export declare class CourseRepository {
    static findAll(): Promise<Course[]>;
    static findById(id: string): Promise<Course | null>;
    static create(course: Omit<Course, 'id' | 'enrolled_count' | 'created_at'>): Promise<Course>;
    static incrementEnrollment(id: string): Promise<boolean>;
    static clearMockData(): Promise<void>;
}
