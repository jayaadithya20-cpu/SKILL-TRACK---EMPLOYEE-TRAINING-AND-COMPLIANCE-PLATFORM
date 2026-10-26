import { Router } from 'express';
import Module from '../models/Module.js';
import Enrollment from '../models/Enrollment.js';
import Certification from '../models/Certification.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah } from '../middleware/error.js';
import { certStatus } from '../utils/certStatus.js';

const router = Router();
router.use(protect);

const isStaff = (u) => u.role === 'admin' || u.role === 'manager';

const visibleTo = (user) =>
  isStaff(user)
    ? {}
    : { isPublished: true, $or: [{ departments: { $size: 0 } }, { departments: user.department }] };

// List modules with the current user's enrollment + certification state
router.get('/', ah(async (req, res) => {
  const filter = visibleTo(req.user);
  if (req.query.category) filter.category = req.query.category;

  const [modules, enrollments, certs] = await Promise.all([
    Module.find(filter).select('-sections -questions.correctIndex').sort('-isMandatory title').lean(),
    Enrollment.find({ user: req.user._id }).lean(),
    Certification.find({ user: req.user._id }).lean(),
  ]);
  const enrMap = new Map(enrollments.map((e) => [String(e.module), e]));
  const certMap = new Map(certs.map((c) => [String(c.module), c]));

  res.json(modules.map((m) => {
    const cert = certMap.get(String(m._id));
    return {
      ...m,
      questionCount: m.questions?.length || 0,
      questions: undefined,
      enrollment: enrMap.get(String(m._id)) || null,
      certification: cert ? { ...cert, status: certStatus(cert.expiresAt) } : null,
    };
  }));
}));

router.get('/:id', ah(async (req, res) => {
  const staff = isStaff(req.user);
  const query = Module.findById(req.params.id);
  if (!staff) query.select('-questions.correctIndex');
  const mod = await query.lean();
  if (!mod) return res.status(404).json({ message: 'Module not found' });

  const [enrollment, cert] = await Promise.all([
    Enrollment.findOne({ user: req.user._id, module: mod._id }).lean(),
    Certification.findOne({ user: req.user._id, module: mod._id }).lean(),
  ]);
  res.json({
    ...mod,
    enrollment,
    certification: cert ? { ...cert, status: certStatus(cert.expiresAt) } : null,
  });
}));

router.post('/', authorize('admin'), ah(async (req, res) => {
  const mod = await Module.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(mod);
}));

router.put('/:id', authorize('admin'), ah(async (req, res) => {
  const mod = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!mod) return res.status(404).json({ message: 'Module not found' });
  res.json(mod);
}));

router.delete('/:id', authorize('admin'), ah(async (req, res) => {
  const mod = await Module.findByIdAndDelete(req.params.id);
  if (!mod) return res.status(404).json({ message: 'Module not found' });
  await Enrollment.deleteMany({ module: mod._id });
  res.json({ message: 'Module deleted' });
}));

// Self-enroll
router.post('/:id/enroll', ah(async (req, res) => {
  const mod = await Module.findOne({ _id: req.params.id, ...visibleTo(req.user) });
  if (!mod) return res.status(404).json({ message: 'Module not found' });
  const enrollment = await Enrollment.findOneAndUpdate(
    { user: req.user._id, module: mod._id },
    { $setOnInsert: { user: req.user._id, module: mod._id } },
    { upsert: true, new: true }
  );
  res.status(201).json(enrollment);
}));

// Mark a content section as read; progress is derived from sections read
router.patch('/:id/progress', ah(async (req, res) => {
  const mod = await Module.findById(req.params.id).select('sections');
  if (!mod) return res.status(404).json({ message: 'Module not found' });
  const idx = Number(req.body.sectionIndex);
  if (!(idx >= 0 && idx < mod.sections.length)) {
    return res.status(400).json({ message: 'Invalid section' });
  }
  let enr = await Enrollment.findOne({ user: req.user._id, module: mod._id });
  if (!enr) enr = new Enrollment({ user: req.user._id, module: mod._id });
  if (!enr.sectionsRead.includes(idx)) enr.sectionsRead.push(idx);
  if (enr.status !== 'completed') {
    // Reading counts for 90%; passing the assessment completes the last 10%
    enr.progress = Math.round((enr.sectionsRead.length / mod.sections.length) * 90);
    enr.status = 'in-progress';
  }
  await enr.save();
  res.json(enr);
}));

// Assign to a department, everyone, or specific users with a due date
router.post('/:id/assign', authorize('admin', 'manager'), ah(async (req, res) => {
  const mod = await Module.findById(req.params.id);
  if (!mod) return res.status(404).json({ message: 'Module not found' });
  const { department, userIds, dueDate } = req.body;

  const filter = { role: 'employee', isActive: true };
  if (req.user.role === 'manager') filter.department = req.user.department;
  else if (department) filter.department = department;
  if (Array.isArray(userIds) && userIds.length) filter._id = { $in: userIds };

  const users = await User.find(filter).select('_id');
  if (!users.length) return res.status(400).json({ message: 'No matching employees to assign' });

  const due = dueDate ? new Date(dueDate) : undefined;
  await Enrollment.bulkWrite(users.map((u) => ({
    updateOne: {
      filter: { user: u._id, module: mod._id },
      update: {
        $set: { dueDate: due, assignedBy: req.user._id },
        $setOnInsert: { user: u._id, module: mod._id },
      },
      upsert: true,
    },
  })));
  await Notification.insertMany(users.map((u) => ({
    user: u._id,
    type: 'assignment',
    message: `You've been assigned "${mod.title}"${due ? ` — due ${due.toDateString()}` : ''}.`,
    link: `/modules/${mod._id}`,
  })));
  res.json({ message: `Assigned to ${users.length} employee(s)`, count: users.length });
}));

export default router;
