import { db } from '../config/database';
import { env } from '../config/env';
import crypto from 'crypto';

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

// In-Memory state for mock mode, seeded with competitive courses
const mockCourses = new Map<string, Course>();

const seedMockCourses = () => {
  if (mockCourses.size > 0) return;
  
  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);
  const inThreeMonths = new Date();
  inThreeMonths.setMonth(now.getMonth() + 3);

  const defaultCourses: Course[] = [
    {
      id: 'course-a1-german',
      title: 'German Mastery Track A1 (Goethe/Telc Prep)',
      description: 'Structured beginner course covering pronunciation, basic conversation, and Goethe A1 exam preparation. Focuses on essential vocabulary for Germany aspirants.',
      level: 'A1',
      price: 12000.00,
      capacity: 25,
      enrolled_count: 5,
      start_date: nextMonth,
      end_date: inThreeMonths,
      created_at: new Date(),
    },
    {
      id: 'course-a2-german',
      title: 'German Mastery Track A2 (Elementary Level)',
      description: 'Expands language skills for routines, describing background and education. Aligned with European CEFR standards.',
      level: 'A2',
      price: 15000.00,
      capacity: 25,
      enrolled_count: 12,
      start_date: nextMonth,
      end_date: inThreeMonths,
      created_at: new Date(),
    },
    {
      id: 'course-b1-german',
      title: 'German B1 Intensive (Ausbildung Pathway)',
      description: 'The golden gate for Ausbildung applicants. Essential focus on workplace communication, reading contracts, and passing Goethe/Telc B1 exams.',
      level: 'B1',
      price: 18000.00,
      capacity: 20,
      enrolled_count: 18,
      start_date: nextMonth,
      end_date: inThreeMonths,
      created_at: new Date(),
    },
    {
      id: 'course-b2-german',
      title: 'German B2 Professional (Nurses & IT Specialist)',
      description: 'Advanced professional level, mandatory for Nursing qualifications and highly recommended for IT developers entering Germany. In-depth vocabulary and workplace simulations.',
      level: 'B2',
      price: 22000.00,
      capacity: 15,
      enrolled_count: 4,
      start_date: nextMonth,
      end_date: inThreeMonths,
      created_at: new Date(),
    }
  ];

  for (const c of defaultCourses) {
    mockCourses.set(c.id, c);
  }
};

// Auto seed mock courses
seedMockCourses();

export class CourseRepository {
  static async findAll(): Promise<Course[]> {
    if (env.DB_MOCK) {
      seedMockCourses();
      return Array.from(mockCourses.values()).map(c => ({ ...c }));
    }

    const result = await db.query(
      'SELECT id, title, description, level, price, capacity, enrolled_count, start_date, end_date, created_at FROM courses ORDER BY level ASC, created_at DESC'
    );
    
    return result.rows.map(row => ({
      ...row,
      price: parseFloat(row.price),
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      created_at: new Date(row.created_at),
    }));
  }

  static async findById(id: string): Promise<Course | null> {
    if (env.DB_MOCK) {
      seedMockCourses();
      const course = mockCourses.get(id);
      return course ? { ...course } : null;
    }

    const result = await db.query(
      'SELECT id, title, description, level, price, capacity, enrolled_count, start_date, end_date, created_at FROM courses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      price: parseFloat(row.price),
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      created_at: new Date(row.created_at),
    };
  }

  static async create(course: Omit<Course, 'id' | 'enrolled_count' | 'created_at'>): Promise<Course> {
    if (env.DB_MOCK) {
      const newCourse: Course = {
        ...course,
        id: crypto.randomUUID(),
        enrolled_count: 0,
        created_at: new Date(),
      };
      mockCourses.set(newCourse.id, newCourse);
      return { ...newCourse };
    }

    const result = await db.query(
      `INSERT INTO courses (title, description, level, price, capacity, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, level, price, capacity, enrolled_count, start_date, end_date, created_at`,
      [
        course.title,
        course.description,
        course.level,
        course.price,
        course.capacity,
        course.start_date,
        course.end_date,
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      price: parseFloat(row.price),
      start_date: new Date(row.start_date),
      end_date: new Date(row.end_date),
      created_at: new Date(row.created_at),
    };
  }

  static async incrementEnrollment(id: string): Promise<boolean> {
    if (env.DB_MOCK) {
      const course = mockCourses.get(id);
      if (!course) return false;
      if (course.enrolled_count >= course.capacity) return false;
      course.enrolled_count += 1;
      return true;
    }

    const result = await db.query(
      `UPDATE courses 
       SET enrolled_count = enrolled_count + 1 
       WHERE id = $1 AND enrolled_count < capacity
       RETURNING enrolled_count`,
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  static async clearMockData(): Promise<void> {
    mockCourses.clear();
    seedMockCourses();
  }
}
