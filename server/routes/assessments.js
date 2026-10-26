import { Router } from 'express';
import crypto from 'crypto';
import Module from '../models/Module.js';
import Enrollment from '../models/Enrollment.js';
import AssessmentResult from '../models/AssessmentResult.js';
import Certification from '../models/Certification.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah } from '../middleware/error.js';
import { addMonths } from '../utils/certStatus.js';

const router = Router();
router.use(protect);

const newCertId = () => `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

router.post('/:moduleId/submit', ah(async (req, res) => {
  const mod = await Module.findById(req.params.moduleId);
  if (!mod) return res.status(404).json({ message: 'Module not found' });
  if (!mod.questions.length) return res.status(400).json({ message: 'This module has no assessment' });

  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  let correct = 0;
  const review = mod.questions.map((q, i) => {
    const ok = answers[i] === q.correctIndex;
    if (ok) correct++;
    return { question: q.question, options: q.options, selected: answers[i] ?? null, correctIndex: q.correctIndex, correct: ok };
  });
  const score = Math.round((correct / mod.questions.length) * 100);
  const passed = score >= mod.passingScore;
  const userId = req.user._id;

  const attemptNumber = (await AssessmentResult.countDocuments({ user: userId, module: mod._id })) + 1;
  const result = await AssessmentResult.create({
    user: userId, module: mod._id, score, passed, answers,
    correctCount: correct, totalQuestions: mod.questions.length, attemptNumber,
    timeTakenSeconds: req.body.timeTakenSeconds,
  });

  let enr = await Enrollment.findOne({ user: userId, module: mod._id });
  if (!enr) enr = new Enrollment({ user: userId, module: mod._id });
  if (passed) {
    enr.status = 'completed';
    enr.progress = 100;
    enr.completedAt = new Date();
  } else if (enr.status !== 'completed') {
    enr.status = 'in-progress';
  }
  await enr.save();

  let certification = null;
  if (passed) {
    const issuedAt = new Date();
    const expiresAt = mod.certificationValidityMonths > 0 ? addMonths(issuedAt, mod.certificationValidityMonths) : null;
    const existing = await Certification.findOne({ user: userId, module: mod._id });
    if (existing) {
      Object.assign(existing, { issuedAt, expiresAt, score, lastReminderSentAt: null });
      existing.renewalCount += 1;
      certification = await existing.save();
    } else {
      certification = await Certification.create({
        user: userId, module: mod._id, certificateId: newCertId(), score, issuedAt, expiresAt,
      });
    }
    await Notification.create({
      user: userId,
      type: 'certificate',
      message: `Certificate ${existing ? 'renewed' : 'earned'}: ${mod.title}`,
      link: '/certifications',
    });
  }

  res.json({ resultId: result._id, score, passed, correct, total: mod.questions.length, passingScore: mod.passingScore, attemptNumber, review, certification });
}));

router.get('/my', ah(async (req, res) => {
  const results = await AssessmentResult.find({ user: req.user._id })
    .populate('module', 'title category passingScore')
    .sort('-createdAt')
    .lean();
  res.json(results);
}));

router.get('/', authorize('admin', 'manager'), ah(async (req, res) => {
  const filter = {};
  if (req.query.module) filter.module = req.query.module;
  const results = await AssessmentResult.find(filter)
    .populate('user', 'name email department')
    .populate('module', 'title')
    .sort('-createdAt')
    .limit(200)
    .lean();
  const scoped = req.user.role === 'manager'
    ? results.filter((r) => r.user?.department === req.user.department)
    : results;
  res.json(scoped);
}));

export default router;
