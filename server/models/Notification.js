import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['assignment', 'renewal', 'expired', 'overdue', 'certificate', 'general'],
      default: 'general',
    },
    message: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
