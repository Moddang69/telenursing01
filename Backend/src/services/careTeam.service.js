import mongoose from 'mongoose';
import { CareTeam, Patient, Nurse } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * careTeam.service.js (Phase 5 services/careTeam.service.js)
 * Business Logic การมอบหมาย/เปลี่ยนพยาบาล (Phase 3.2 #2 — ประวัติ Care Team ทั้งหมด)
 */

/**
 * AssignNurse: ใช้ทั้งตอน Patient เลือก Nurse ครั้งแรก (SelectNursePage) และ Admin Reassign
 * Logic: จบ CareTeam ACTIVE เดิม (ถ้ามี) -> สร้าง CareTeam ใหม่ -> อัปเดต patient.assignedNurseId
 */
export async function assignNurse({ patientId, nurseId, assignedByUserId, reason = 'Initial assignment' }) {
  const nurse = await Nurse.findById(nurseId);
  if (!nurse || nurse.approvalStatus !== 'APPROVED') {
    throw new ApiError(400, 'ไม่สามารถมอบหมายพยาบาลที่ยังไม่ได้รับการอนุมัติ');
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError(404, 'ไม่พบข้อมูลผู้ป่วย');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // จบ Care Team เดิมที่ ACTIVE (ถ้ามี) — เก็บเป็นประวัติ (Phase 3.2 #2)
    await CareTeam.updateMany(
      { patientId, status: 'ACTIVE' },
      { $set: { status: 'ENDED', endedAt: new Date() } },
      { session }
    );

    const newCareTeam = await CareTeam.create(
      [
        {
          patientId,
          nurseId,
          status: 'ACTIVE',
          assignedAt: new Date(),
          reason,
          assignedBy: assignedByUserId,
        },
      ],
      { session }
    );

    patient.assignedNurseId = nurseId;
    patient.hasAssignment = true;
    await patient.save({ session });

    await session.commitTransaction();
    session.endSession();

    return newCareTeam[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

/**
 * GetAssignmentHistory: คืนประวัติ Care Team ทั้งหมดของ Patient (สำหรับ Admin/AdminPatientManagementPage)
 */
export async function getAssignmentHistory(patientId) {
  return CareTeam.find({ patientId })
    .populate('nurseId', 'firstName lastName licenseNumber')
    .populate('assignedBy', 'email role')
    .sort({ assignedAt: -1 });
}

/**
 * GetAvailableNurses: คืน Nurse ที่ approvalStatus=APPROVED สำหรับหน้า SelectNursePage
 * (แก้บั๊ก Assumption A9 ฝั่ง Backend — Endpoint พร้อมใช้งานแล้ว รอ Frontend assignmentService.js แก้ให้ import จริง)
 */
export async function getAvailableNurses() {
  return Nurse.find({ approvalStatus: 'APPROVED' }).select(
    'firstName lastName hospital department ward position expertise'
  );
}

export default { assignNurse, getAssignmentHistory, getAvailableNurses };
