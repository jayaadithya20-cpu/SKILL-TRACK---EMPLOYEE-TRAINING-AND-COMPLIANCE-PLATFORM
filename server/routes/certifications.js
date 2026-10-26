import { Router } from 'express';
import Certification from '../models/Certification.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah } from '../middleware/error.js';
import { runReminders } from '../jobs/reminders.js';

const router = Router();
router.use(protect);

router.get('/my', ah(async (req, res) => {
  const certs = await Certification.find({ user: req.user._id })
    .populate('module', 'title category certificationValidityMonths')
    .sort('expiresAt');
  res.json(certs);
}));

// Organisation view. ?status=active|expiring|expired
router.get('/', authorize('admin', 'manager'), ah(async (req, res) => {
  const filter = {};
  if (req.user.role === 'manager') {
    const ids = await User.find({ department: req.user.department }).distinct('_id');
    filter.user = { $in: ids };
  }
  let certs = await Certification.find(filter)
    .populate('user', 'name email department')
    .populate('module', 'title category')
    .sort('expiresAt');
  if (req.query.status) certs = certs.filter((c) => c.status === req.query.status);
  res.json(certs);
}));

// Lets an admin trigger the reminder job without waiting for cron
router.post('/run-reminders', authorize('admin'), ah(async (req, res) => {
  res.json(await runReminders());
}));

export default router;
