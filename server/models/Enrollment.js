import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'completed'],
      default: 'not-started',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    sectionsRead: { type: [Number], default: [] },
    dueDate: { type: Date },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    lastReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, module: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
