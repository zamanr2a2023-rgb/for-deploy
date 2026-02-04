// src/utils/jwt.js
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export const signToken = (payload, expiresIn = '7d') =>
  jwt.sign(payload, JWT_SECRET, { expiresIn });

export const generateToken = signToken; // Alias for consistency

export const verifyToken = (token) =>
  jwt.verify(token, JWT_SECRET);
