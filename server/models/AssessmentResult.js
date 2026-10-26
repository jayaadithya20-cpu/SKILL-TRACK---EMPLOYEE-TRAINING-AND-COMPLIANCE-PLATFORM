import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    correctCount: Number,
    totalQuestions: Number,
    answers: [Number],
    attemptNumber: { type: Number, default: 1 },
    timeTakenSeconds: Number,
  },
  { timestamps: true }
);

resultSchema.index({ user: 1, module: 1, createdAt: -1 });

export default mongoose.model('AssessmentResult', resultSchema);
