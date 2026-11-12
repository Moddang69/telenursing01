import mongoose from 'mongoose';

/**
 * Appointment.js (Phase 2 / 2.3 appointments)
 * preConsult เป็น Embedded Document (Phase 3.2 #7 — 1:1 lifecycle เดียวกัน, อ่านพร้อมกันเสมอ)
 */
const preConsultSchema = new mongoose.Schema(
  {
    location: { type: String, default: null }, // reverse-geocoded address string
    gpsCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    emergencyContact: { type: String, default: null },
    latestGlucose: { type: String, default: null },
    latestBP: { type: String, default: null },
    painLevel: { type: Number, min: 0, max: 10, default: null },
    symptoms: { type: [String], default: [] },
    otherSymptom: { type: String, default: null },
    hospitalizedLastMonth: { type: Boolean, default: null },
    submittedAt: { type: Date, default: null },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    nurseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Nurse',
      required: true,
    },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // "HH:mm"
    dueDateTime: { type: Date, required: true },
    reason: { type: String, default: null },
    note: { type: String, default: null },
    status: {
      type: String,
      enum: [
        'SCHEDULED',
        'WAITING',
        'PATIENT_JOINED',
        'NURSE_JOINED',
        'IN_CONSULTATION',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW',
        'RESCHEDULED',
      ],
      default: 'SCHEDULED',
    },
    preConsult: { type: preConsultSchema, default: null },
  },
  { timestamps: true }
);

appointmentSchema.index({ nurseId: 1, dueDateTime: 1 });
appointmentSchema.index({ patientId: 1, dueDateTime: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ dueDateTime: 1 }); // Retention purge

export default mongoose.model('Appointment', appointmentSchema);
