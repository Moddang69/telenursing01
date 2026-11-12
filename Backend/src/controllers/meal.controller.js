import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { MealLog } from '../models/index.js';

/**
 * meal.controller.js — Map ตรงกับ MealLogPage.jsx
 */

// POST /api/meals/:patientId
export const createMealLog = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { meal, description, photoUrl, date, time } = req.body;

  const log = await MealLog.create({
    patientId,
    meal,
    description,
    photoUrl: photoUrl || null,
    date,
    time,
    recordedBy: req.user.role, // patient | caregiver
    recordedByUserId: req.user.userId,
  });

  res.status(201).json({ success: true, message: 'บันทึกมื้ออาหารสำเร็จ', data: log });
});

// GET /api/meals/:patientId?startDate=&endDate=
export const getMealLogs = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { startDate, endDate, limit } = req.query;

  const filter = { patientId };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const logs = await MealLog.find(filter).sort({ date: -1 }).limit(limit ? parseInt(limit, 10) : 100);
  res.status(200).json({ success: true, data: logs });
});

// GET /api/meals/:patientId/:logId
export const getMealLogById = asyncHandler(async (req, res) => {
  const log = await MealLog.findById(req.params.logId);
  if (!log) throw new ApiError(404, 'ไม่พบข้อมูลรายการนี้');
  res.status(200).json({ success: true, data: log });
});

export default { createMealLog, getMealLogs, getMealLogById };
