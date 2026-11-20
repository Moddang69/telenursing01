import mongoose from 'mongoose';

/**
 * Caregiver.js (Phase 2 / 2.3 caregivers)
 * FK: userId -> users._id (1:1)
 */
const caregiverSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    address: { type: String, default: null },
    secondaryContact: { type: String, default: null },
  },
  { timestamps: true }
);


export default mongoose.model('Caregiver', caregiverSchema);
