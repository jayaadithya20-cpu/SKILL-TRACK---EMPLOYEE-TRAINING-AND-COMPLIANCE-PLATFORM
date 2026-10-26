import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  heading: { type: String, required: true },
  body: { type: String, required: true },
});

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    validate: [(v) => v.length >= 2, 'A question needs at least two options'],
  },
  correctIndex: { type: Number, required: true, min: 0 },
});

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['compliance', 'technical', 'safety', 'soft-skills', 'leadership'],
      default: 'technical',
    },
    durationMinutes: { type: Number, default: 30 },
    isMandatory: { type: Boolean, default: false },
    // Empty array = available to every department
    departments: { type: [String], default: [] },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    // 0 = certification never expires
    certificationValidityMonths: { type: Number, default: 12, min: 0 },
    sections: [sectionSchema],
    questions: [questionSchema],
    isPublished: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Module', moduleSchema);
