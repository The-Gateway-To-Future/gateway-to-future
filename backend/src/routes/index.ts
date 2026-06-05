import { Router } from 'express';
import authRoutes from './auth.routes';
import courseRoutes from './course.routes';
import appointmentRoutes from './appointment.routes';
import paymentRoutes from './payment.routes';
import materialRoutes from './material.routes';

const router = Router();

// Mount modules
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/materials', materialRoutes);

export default router;
