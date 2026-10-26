import jwt from 'jsonwebtoken';

export const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
