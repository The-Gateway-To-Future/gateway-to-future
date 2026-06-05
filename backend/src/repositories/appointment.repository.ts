import { db } from '../config/database';
import { env } from '../config/env';
import crypto from 'crypto';

export interface Appointment {
  id: string;
  student_id: string;
  student_name?: string; // joined user details
  counselor_id?: string;
  appointment_date: string; // YYYY-MM-DD
  time_slot: string; // formatted e.g. "9:00 PM IST / 5:30 PM CEST"
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: Date;
}

// In-Memory state for mock mode
const mockAppointments = new Map<string, Appointment>();

export class AppointmentRepository {
  static async findByStudentAndDate(studentId: string, dateStr: string): Promise<Appointment | null> {
    if (env.DB_MOCK) {
      for (const app of mockAppointments.values()) {
        if (app.student_id === studentId && app.appointment_date === dateStr && app.status !== 'cancelled') {
          return { ...app };
        }
      }
      return null;
    }

    const result = await db.query(
      `SELECT id, student_id, counselor_id, appointment_date::TEXT as appointment_date, time_slot, status, notes, created_at 
       FROM appointments 
       WHERE student_id = $1 AND appointment_date = $2 AND status != 'cancelled'`,
      [studentId, dateStr]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      ...row,
      created_at: new Date(row.created_at),
    };
  }

  static async findByDate(dateStr: string): Promise<Appointment[]> {
    if (env.DB_MOCK) {
      return Array.from(mockAppointments.values())
        .filter(app => app.appointment_date === dateStr && app.status !== 'cancelled')
        .map(app => ({ ...app }));
    }

    const result = await db.query(
      `SELECT a.id, a.student_id, u.name as student_name, a.counselor_id, a.appointment_date::TEXT as appointment_date, a.time_slot, a.status, a.notes, a.created_at 
       FROM appointments a
       JOIN users u ON a.student_id = u.id
       WHERE a.appointment_date = $1 AND a.status != 'cancelled'`,
      [dateStr]
    );

    return result.rows.map(row => ({
      ...row,
      created_at: new Date(row.created_at),
    }));
  }

  static async findByStudent(studentId: string): Promise<Appointment[]> {
    if (env.DB_MOCK) {
      return Array.from(mockAppointments.values())
        .filter(app => app.student_id === studentId)
        .map(app => ({ ...app }))
        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
    }

    const result = await db.query(
      `SELECT id, student_id, counselor_id, appointment_date::TEXT as appointment_date, time_slot, status, notes, created_at 
       FROM appointments 
       WHERE student_id = $1 
       ORDER BY appointment_date DESC`,
      [studentId]
    );

    return result.rows.map(row => ({
      ...row,
      created_at: new Date(row.created_at),
    }));
  }

  static async create(appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> {
    if (env.DB_MOCK) {
      const newApp: Appointment = {
        ...appointment,
        id: crypto.randomUUID(),
        created_at: new Date(),
      };
      mockAppointments.set(newApp.id, newApp);
      return { ...newApp };
    }

    const result = await db.query(
      `INSERT INTO appointments (student_id, counselor_id, appointment_date, time_slot, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, student_id, counselor_id, appointment_date::TEXT as appointment_date, time_slot, status, notes, created_at`,
      [
        appointment.student_id,
        appointment.counselor_id || null,
        appointment.appointment_date,
        appointment.time_slot,
        appointment.status,
        appointment.notes || null,
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      created_at: new Date(row.created_at),
    };
  }

  static async clearMockData(): Promise<void> {
    mockAppointments.clear();
  }
}
