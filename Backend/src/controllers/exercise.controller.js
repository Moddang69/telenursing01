import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ExerciseLog } from '../models/index.js';

/**
 * exercise.controller.js — Map ตรงกับ ExerciseLogPage.jsx
 */

// POST /api/exercises/:patientId
export const createExerciseLog = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { activity, duration, distance, pace, date, time } = req.body;

  const log = await ExerciseLog.create({
    patientId,
    activity,
    duration,
    distance: distance || null,
    pace: pace || null,
    date,
    time,
    recordedBy: req.user.role,
    recordedByUserId: req.user.userId,
  });

  res.status(201).json({ success: true, message: 'บันทึกการออกกำลังกายสำเร็จ', data: log });
});

// GET /api/exercises/:patientId?startDate=&endDate=
export const getExerciseLogs = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { startDate, endDate, limit } = req.query;

  const filter = { patientId };
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const logs = await ExerciseLog.find(filter).sort({ date: -1 }).limit(limit ? parseInt(limit, 10) : 100);
  res.status(200).json({ success: true, data: logs });
});

// GET /api/exercises/:patientId/:logId
export const getExerciseLogById = asyncHandler(async (req, res) => {
  const log = await ExerciseLog.findById(req.params.logId);
  if (!log) throw new ApiError(404, 'ไม่พบข้อมูลรายการนี้');
  res.status(200).json({ success: true, data: log });
});

export default { createExerciseLog, getExerciseLogs, getExerciseLogById };
