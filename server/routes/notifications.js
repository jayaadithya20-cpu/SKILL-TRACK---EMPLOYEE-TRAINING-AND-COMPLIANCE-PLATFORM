import { Router } from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { ah } from '../middleware/error.js';

const router = Router();
router.use(protect);

router.get('/', ah(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(50).lean();
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ items, unread });
}));

router.patch('/read-all', ah(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All marked as read' });
}));

router.patch('/:id/read', ah(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id }, { read: true }, { new: true }
  );
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json(n);
}));

export default router;
