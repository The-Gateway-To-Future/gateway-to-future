import { Request, Response } from 'express';
import { CourseRepository } from '../repositories/course.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { CacheService } from '../services/cache.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const CACHE_KEY_COURSES = 'courses:all';

export class CourseController {
  static async getCourses(req: Request, res: Response): Promise<void> {
    try {
      // 1. Try reading from cache
      const cachedCourses = await CacheService.get<any[]>(CACHE_KEY_COURSES);
      if (cachedCourses) {
        res.status(200).json({ courses: cachedCourses, cached: true });
        return;
      }

      // 2. Fetch from DB
      const courses = await CourseRepository.findAll();

      // 3. Save to cache for 1 hour
      await CacheService.set(CACHE_KEY_COURSES, courses, 3600);

      res.status(200).json({ courses, cached: false });
    } catch (err: any) {
      res.status(500).json({ message: 'Error retrieving courses list.', error: err.message });
    }
  }

  static async createCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { title, description, level, price, capacity, start_date, end_date } = req.body;

    try {
      const course = await CourseRepository.create({
        title,
        description,
        level,
        price: parseFloat(price),
        capacity: parseInt(capacity, 10),
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      });

      // Invalidate cache
      await CacheService.del(CACHE_KEY_COURSES);

      res.status(211).json({ message: 'Course created successfully.', course });
    } catch (err: any) {
      res.status(500).json({ message: 'Error creating course.', error: err.message });
    }
  }

  static async bookCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id: courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized action.' });
      return;
    }

    try {
      const course = await CourseRepository.findById(courseId);
      if (!course) {
        res.status(404).json({ message: 'Course not found.' });
        return;
      }

      // Check if course is full
      if (course.enrolled_count >= course.capacity) {
        res.status(400).json({ message: 'Course capacity has been reached. Booking unavailable.' });
        return;
      }

      // Check if user already booked this course
      const myBookings = await PaymentRepository.findBookingsByUser(userId);
      const alreadyBooked = myBookings.find(b => b.course_id === courseId && b.status !== 'cancelled');
      if (alreadyBooked) {
        res.status(400).json({ message: 'You have already booked this course.' });
        return;
      }

      // Create Booking in pending state
      const booking = await PaymentRepository.createBooking(userId, courseId);

      res.status(211).json({
        message: 'Booking initiated successfully. Please complete your payment.',
        booking: {
          ...booking,
          course_title: course.title,
          course_level: course.level,
          course_price: course.price,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Error initiating booking.', error: err.message });
    }
  }

  static async getMyBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized action.' });
      return;
    }

    try {
      const bookings = await PaymentRepository.findBookingsByUser(userId);
      res.status(200).json({ bookings });
    } catch (err: any) {
      res.status(500).json({ message: 'Error fetching bookings.', error: err.message });
    }
  }
}
