import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: '无效或过期的token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权访问' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '权限不足' });
      return;
    }

    next();
  };
};
