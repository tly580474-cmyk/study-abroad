import { Response } from 'express';
import { authService } from '../services/authService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { LoginSchema, RegisterSchema } from '../services/schemas.js';

export const login = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username, password } = LoginSchema.parse(req.body);
    const result = await authService.login(username, password);
    res.json({ success: true, data: result });
  }
);

export const register = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username, password, email, phone } = RegisterSchema.parse(req.body);
    const role = 'student';
    const user = await authService.register(username, password, role, email, phone);
    res.status(201).json({ success: true, data: user });
  }
);

export const getProfile = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }
    res.json({ success: true, data: req.user });
  }
);
