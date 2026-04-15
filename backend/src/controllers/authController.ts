import { Response } from 'express';
import { authService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';
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

export const sendCode = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, type } = req.body;

    if (!email || !type) {
      res.status(400).json({ success: false, error: '邮箱和类型不能为空' });
      return;
    }

    if (!['REGISTER', 'RESET_PASSWORD'].includes(type)) {
      res.status(400).json({ success: false, error: '无效的验证码类型' });
      return;
    }

    const result = await emailService.sendVerificationCode(email, type);

    if (!result.success) {
      res.status(429).json({ success: false, error: result.message, retryAfter: result.retryAfter });
      return;
    }

    res.json({ success: true, message: result.message });
  }
);

export const verifyCode = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, code, type } = req.body;

    if (!email || !code || !type) {
      res.status(400).json({ success: false, error: '邮箱、验证码和类型不能为空' });
      return;
    }

    const result = await emailService.verifyCode(email, code, type);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }

    res.json({ success: true, message: result.message, verificationId: result.verificationId });
  }
);

export const registerWithEmail = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username, password, email, code } = req.body;

    if (!username || !password || !email || !code) {
      res.status(400).json({ success: false, error: '所有字段均为必填' });
      return;
    }

    const result = await emailService.registerWithEmail(username, password, email, code);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }

    res.status(201).json({ success: true, data: { user: result.user, token: result.token } });
  }
);
