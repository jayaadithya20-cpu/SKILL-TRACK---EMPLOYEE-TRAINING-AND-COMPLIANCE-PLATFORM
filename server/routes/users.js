import { Router } from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah } from '../middleware/error.js';

const router = Router();
router.use(protect, authorize('admin', 'manager'));

router.get('/', ah(async (req, res) => {
  const filter = req.user.role === 'manager' ? { department: req.user.department } : {};
  if (req.query.department) filter.department = req.query.department;
  const users = await User.find(filter).sort('name');
  res.json(users);
}));

router.get('/departments', ah(async (req, res) => {
  res.json((await User.distinct('department')).sort());
}));

router.patch('/:id', authorize('admin'), ah(async (req, res) => {
  const allowed = ['role', 'department', 'jobTitle', 'isActive'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));

export default router;
