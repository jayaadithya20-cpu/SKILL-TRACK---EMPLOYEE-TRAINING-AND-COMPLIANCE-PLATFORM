import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Sign in to continue' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = await User.findById(id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Account not found or disabled' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired. Sign in again.' });
  }
}

export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission for this action' });
  }
  next();
};
