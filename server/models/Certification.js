import mongoose from 'mongoose';
import { certStatus } from '../utils/certStatus.js';

const certificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    certificateId: { type: String, required: true, unique: true },
    score: Number,
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // null = never expires
    renewalCount: { type: Number, default: 0 },
    lastReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

certificationSchema.index({ user: 1, module: 1 }, { unique: true });

certificationSchema.virtual('status').get(function () {
  return certStatus(this.expiresAt);
});

export default mongoose.model('Certification', certificationSchema);
