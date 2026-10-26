import { Router } from 'express';
import User from '../models/User.js';
import Module from '../models/Module.js';
import Enrollment from '../models/Enrollment.js';
import { signToken } from '../utils/token.js';
import { protect } from '../middleware/auth.js';
import { ah } from '../middleware/error.js';
import { DAY } from '../utils/certStatus.js';

const router = Router();

const publicUser = (u) => ({
  _id: u._id, name: u.name, email: u.email, role: u.role,
  department: u.department, jobTitle: u.jobTitle,
});

// Auto-enroll a new employee in mandatory modules for their department
async function enrollMandatory(user) {
  const modules = await Module.find({
    isMandatory: true,
    isPublished: true,
    $or: [{ departments: { $size: 0 } }, { departments: user.department }],
  }).select('_id');
  const dueDate = new Date(Date.now() + 30 * DAY);
  if (!modules.length) return;
  await Enrollment.insertMany(
    modules.map((m) => ({ user: user._id, module: m._id, dueDate })),
    { ordered: false }
  ).catch(() => {});
}

router.post('/register', ah(async (req, res) => {
  const { name, email, password, department, jobTitle } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (await User.findOne({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }
  // Self-registration always creates an employee. Admins promote roles.
  const user = await User.create({ name, email, password, department, jobTitle });
  await enrollMandatory(user);
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
}));

router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password || ''))) {
    return res.status(401).json({ message: 'Email or password is incorrect' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'This account is disabled' });
  res.json({ token: signToken(user._id), user: publicUser(user) });
}));

router.get('/me', protect, (req, res) => res.json(publicUser(req.user)));

export default router;
