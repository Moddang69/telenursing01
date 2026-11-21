import express from 'express';
import mongoose from 'mongoose';

import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import nurseRoutes from './nurse.routes.js';
import assignmentRoutes from './assignment.routes.js';
import healthRoutes from './health.routes.js';
import mealRoutes from './meal.routes.js';
import exerciseRoutes from './exercise.routes.js';
import carePlanRoutes from './carePlan.routes.js';
import educationRoutes from './education.routes.js';
import appointmentRoutes from './appointment.routes.js';
import videoSessionRoutes from './videoSession.routes.js';
import chatRoutes from './chat.routes.js';
import caregiverRoutes from './caregiver.routes.js';
import consentRoutes from './consent.routes.js';
import dataRequestRoutes from './dataRequest.routes.js';
import adminRoutes from './admin.routes.js';
import notificationRoutes from './notification.routes.js';
import searchRoutes from './search.routes.js';
import satisfactionRatingRoutes from './satisfactionRating.routes.js';
import caseClosureRoutes from './caseClosure.routes.js';

/**
 * routes/index.js (FINAL)
 * รวม Route ครบทั้งหมดตาม 18 Collections + Real-time Layer
 * โครงสร้างนี้ครบตาม Phase 5 Design Blueprint แล้วทั้งระบบ
 */
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Telenursing Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/models', (req, res) => {
  const registeredModels = mongoose.modelNames();
  res.status(200).json({ success: true, totalModels: registeredModels.length, models: registeredModels });
});

// ---------- Resource Routes (ครบทั้งหมด) ----------
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/nurses', nurseRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/health', healthRoutes);
router.use('/meals', mealRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/care-plans', carePlanRoutes);
router.use('/educations', educationRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/video-sessions', videoSessionRoutes);
router.use('/chat', chatRoutes);
router.use('/caregivers', caregiverRoutes);
router.use('/consents', consentRoutes);
router.use('/data-requests', dataRequestRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/satisfaction-ratings', satisfactionRatingRoutes);
router.use('/case-closures', caseClosureRoutes);

export default router;