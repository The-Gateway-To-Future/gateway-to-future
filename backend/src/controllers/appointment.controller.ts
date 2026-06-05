import { Request, Response } from 'express';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { TimezoneService } from '../services/timezone.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AppointmentController {
  static async getAvailableSlots(req: Request, res: Response): Promise<void> {
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ message: 'Missing date parameter. Format: YYYY-MM-DD.' });
      return;
    }

    try {
      const slotInfo = TimezoneService.getSlotDetails(date);
      if (!slotInfo.isValid) {
        res.status(400).json({
          message: 'Requested booking date is invalid or falls in the past.',
          details: slotInfo,
        });
        return;
      }

      // Check if slot is already booked for this date
      const activeAppointments = await AppointmentRepository.findByDate(date);
      const isBooked = activeAppointments.length > 0;

      res.status(200).json({
        date,
        slot: slotInfo.formattedSlot,
        available: !isBooked,
        timezone_conversions: {
          india: '9:00 PM IST',
          germany: `${slotInfo.cestTime} PM`,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Error checking slots availability.', error: err.message });
    }
  }

  static async bookAppointment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { date, notes } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized action.' });
      return;
    }

    try {
      const slotInfo = TimezoneService.getSlotDetails(date);
      if (!slotInfo.isValid) {
        res.status(400).json({ message: 'Requested date is invalid or falls in the past.' });
        return;
      }

      // 1. Check if student already has a slot booked for this date
      const studentDateBooking = await AppointmentRepository.findByStudentAndDate(studentId, date);
      if (studentDateBooking) {
        res.status(400).json({ message: 'You already have a counseling session scheduled on this date.' });
        return;
      }

      // 2. Check if the slot is already booked by another student (since it is a single daily slot at 9:00 PM IST)
      const existingDateBookings = await AppointmentRepository.findByDate(date);
      if (existingDateBookings.length > 0) {
        res.status(400).json({ message: 'The daily counseling slot for this date is already booked.' });
        return;
      }

      // 3. Create the appointment
      const appointment = await AppointmentRepository.create({
        student_id: studentId,
        appointment_date: date,
        time_slot: slotInfo.formattedSlot,
        status: 'scheduled',
        notes,
      });

      res.status(211).json({
        message: 'Counseling session booked successfully.',
        appointment,
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Error scheduling appointment.', error: err.message });
    }
  }

  static async getMyAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    const studentId = req.user?.id;

    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized action.' });
      return;
    }

    try {
      const appointments = await AppointmentRepository.findByStudent(studentId);
      res.status(200).json({ appointments });
    } catch (err: any) {
      res.status(500).json({ message: 'Error fetching appointments list.', error: err.message });
    }
  }
}
