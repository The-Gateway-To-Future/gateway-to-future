"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseController = void 0;
const course_repository_1 = require("../repositories/course.repository");
const payment_repository_1 = require("../repositories/payment.repository");
const cache_service_1 = require("../services/cache.service");
const CACHE_KEY_COURSES = 'courses:all';
class CourseController {
    static async getCourses(req, res) {
        try {
            // 1. Try reading from cache
            const cachedCourses = await cache_service_1.CacheService.get(CACHE_KEY_COURSES);
            if (cachedCourses) {
                res.status(200).json({ courses: cachedCourses, cached: true });
                return;
            }
            // 2. Fetch from DB
            const courses = await course_repository_1.CourseRepository.findAll();
            // 3. Save to cache for 1 hour
            await cache_service_1.CacheService.set(CACHE_KEY_COURSES, courses, 3600);
            res.status(200).json({ courses, cached: false });
        }
        catch (err) {
            res.status(500).json({ message: 'Error retrieving courses list.', error: err.message });
        }
    }
    static async createCourse(req, res) {
        const { title, description, level, price, capacity, start_date, end_date } = req.body;
        try {
            const course = await course_repository_1.CourseRepository.create({
                title,
                description,
                level,
                price: parseFloat(price),
                capacity: parseInt(capacity, 10),
                start_date: new Date(start_date),
                end_date: new Date(end_date),
            });
            // Invalidate cache
            await cache_service_1.CacheService.del(CACHE_KEY_COURSES);
            res.status(211).json({ message: 'Course created successfully.', course });
        }
        catch (err) {
            res.status(500).json({ message: 'Error creating course.', error: err.message });
        }
    }
    static async bookCourse(req, res) {
        const { id: courseId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized action.' });
            return;
        }
        try {
            const course = await course_repository_1.CourseRepository.findById(courseId);
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
            const myBookings = await payment_repository_1.PaymentRepository.findBookingsByUser(userId);
            const alreadyBooked = myBookings.find(b => b.course_id === courseId && b.status !== 'cancelled');
            if (alreadyBooked) {
                res.status(400).json({ message: 'You have already booked this course.' });
                return;
            }
            // Create Booking in pending state
            const booking = await payment_repository_1.PaymentRepository.createBooking(userId, courseId);
            res.status(211).json({
                message: 'Booking initiated successfully. Please complete your payment.',
                booking: {
                    ...booking,
                    course_title: course.title,
                    course_level: course.level,
                    course_price: course.price,
                },
            });
        }
        catch (err) {
            res.status(500).json({ message: 'Error initiating booking.', error: err.message });
        }
    }
    static async getMyBookings(req, res) {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized action.' });
            return;
        }
        try {
            const bookings = await payment_repository_1.PaymentRepository.findBookingsByUser(userId);
            res.status(200).json({ bookings });
        }
        catch (err) {
            res.status(500).json({ message: 'Error fetching bookings.', error: err.message });
        }
    }
}
exports.CourseController = CourseController;
