"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentRepository = void 0;
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const crypto_1 = __importDefault(require("crypto"));
// In-Memory state for mock mode
const mockAppointments = new Map();
class AppointmentRepository {
    static async findByStudentAndDate(studentId, dateStr) {
        if (env_1.env.DB_MOCK) {
            for (const app of mockAppointments.values()) {
                if (app.student_id === studentId && app.appointment_date === dateStr && app.status !== 'cancelled') {
                    return { ...app };
                }
            }
            return null;
        }
        const result = await database_1.db.query(`SELECT id, student_id, counselor_id, appointment_date::TEXT as appointment_date, time_slot, status, notes, created_at 
       FROM appointments 
       WHERE student_id = $1 AND appointment_date = $2 AND status != 'cancelled'`, [studentId, dateStr]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        return {
            ...row,
            created_at: new Date(row.created_at),
        };
    }
    static async findByDate(dateStr) {
        if (env_1.env.DB_MOCK) {
            return Array.from(mockAppointments.values())
                .filter(app => app.appointment_date === dateStr && app.status !== 'cancelled')
                .map(app => ({ ...app }));
        }
        const result = await database_1.db.query(`SELECT a.id, a.student_id, u.name as student_name, a.counselor_id, a.appointment_date::TEXT as appointment_date, a.time_slot, a.status, a.notes, a.created_at 
       FROM appointments a
       JOIN users u ON a.student_id = u.id
       WHERE a.appointment_date = $1 AND a.status != 'cancelled'`, [dateStr]);
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at),
        }));
    }
    static async findByStudent(studentId) {
        if (env_1.env.DB_MOCK) {
            return Array.from(mockAppointments.values())
                .filter(app => app.student_id === studentId)
                .map(app => ({ ...app }))
                .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
        }
        const result = await database_1.db.query(`SELECT id, student_id, counselor_id, appointment_date::TEXT as appointment_date, time_slot, status, notes, created_at 
       FROM appointments 
       WHERE student_id = $1 
       ORDER BY appointment_date DESC`, [studentId]);
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at),
        }));
    }
    static async create(appointment) {
        if (env_1.env.DB_MOCK) {
            const newApp = {
                ...appointment,
                id: crypto_1.default.randomUUID(),
                created_at: new Date(),
            };
            mockAppointments.set(newApp.id, newApp);
            return { ...newApp };
        }
        const result = await database_1.db.query(`INSERT INTO appointments (student_id, counselor_id, appointment_date, time_slot, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, student_id, counselor_id, appointment_date::TEXT as appointment_date, time_slot, status, notes, created_at`, [
            appointment.student_id,
            appointment.counselor_id || null,
            appointment.appointment_date,
            appointment.time_slot,
            appointment.status,
            appointment.notes || null,
        ]);
        const row = result.rows[0];
        return {
            ...row,
            created_at: new Date(row.created_at),
        };
    }
    static async clearMockData() {
        mockAppointments.clear();
    }
}
exports.AppointmentRepository = AppointmentRepository;
