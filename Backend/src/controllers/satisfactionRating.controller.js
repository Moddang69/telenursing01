import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { SatisfactionRating, Appointment, VideoSession } from '../models/index.js';
import { logAudit } from '../middleware/auditLogger.js';

/**
 * satisfactionRating.controller.js
 * จัดการคะแนนความพึงพอใจของผู้ป่วยหลังวิดีโอคอล
 */

// POST /api/satisfaction-ratings - ผู้ป่วยให้คะแนนหลังวิดีโอคอลเสร็จ
export const createSatisfactionRating = asyncHandler(async (req, res) => {
  const { appointmentId, rating, comment } = req.body;
  const patientId = req.user.userId;

  // ตรวจสอบว่านัดหมายมีอยู่และเสร็จสิ้นแล้ว
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new ApiError(404, 'ไม่พบข้อมูลการนัดหมาย');
  }

  if (appointment.status !== 'COMPLETED') {
    throw new ApiError(400, 'สามารถให้คะแนนได้เฉพาะนัดหมายที่เสร็จสิ้นแล้วเท่านั้น');
  }

  // ตรวจสอบว่าเป็นนัดหมายของผู้ป่วยคนนี้
  if (appointment.patientId.toString() !== patientId) {
    throw new ApiError(403, 'ไม่มีสิทธิ์ให้คะแนนนัดหมายนี้');
  }

  // ตรวจสอบว่าเคยให้คะแนนแล้วหรือยัง
  const existingRating = await SatisfactionRating.findOne({ appointmentId });
  if (existingRating) {
    throw new ApiError(409, 'ท่านได้ให้คะแนนนัดหมายนี้ไปแล้ว');
  }

  // สร้างคะแนนใหม่
  const satisfactionRating = await SatisfactionRating.create({
    appointmentId,
    patientId,
    nurseId: appointment.nurseId,
    rating,
    comment: comment || null,
  });

  await logAudit({
    userId: req.user.userId,
    userName: 'patient',
    action: `Created Satisfaction Rating for Appointment ${appointmentId}`,
    targetType: 'satisfactionrating',
    targetId: satisfactionRating._id.toString(),
    result: 'Success',
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'ให้คะแนนความพึงพอใจสำเร็จ',
    data: satisfactionRating,
  });
});

// GET /api/satisfaction-ratings/nurse/:nurseId - ดึงคะแนนทั้งหมดของพยาบาล
export const getNurseSatisfactionRatings = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  const ratings = await SatisfactionRating.find({ nurseId })
    .populate('patientId', 'firstName lastName')
    .populate('appointmentId', 'dueDateTime')
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    data: ratings,
  });
});

// GET /api/satisfaction-ratings/nurse/:nurseId/average - คำนวณคะแนนเฉลี่ย
export const getNurseAverageRating = asyncHandler(async (req, res) => {
  const { nurseId } = req.params;

  const result = await SatisfactionRating.aggregate([
    { $match: { nurseId: nurseId.toString() } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const average = result[0]?.averageRating || 0;
  const total = result[0]?.totalRatings || 0;

  res.status(200).json({
    success: true,
    data: {
      averageRating: Math.round(average * 10) / 10,
      totalRatings: total,
    },
  });
});

// GET /api/satisfaction-ratings/check/:appointmentId - เช็คว่าผู้ป่วยให้คะแนนแล้วหรือยัง
export const checkRatingExists = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const patientId = req.user.userId;

  const existingRating = await SatisfactionRating.findOne({ appointmentId, patientId });

  res.status(200).json({
    success: true,
    data: {
      hasRated: !!existingRating,
    },
  });
});

export default {
  createSatisfactionRating,
  getNurseSatisfactionRatings,
  getNurseAverageRating,
  checkRatingExists,
};
