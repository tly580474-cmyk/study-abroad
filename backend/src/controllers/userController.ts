import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

export const getUsers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { role, school_id } = req.query;
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (school_id) {
      where.school_id = school_id;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        phone: true,
        school_id: true,
        managed_schools: true,
        created_at: true,
        updated_at: true,
        password: false,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, data: users, total: users.length });
  }
);

export const getUserById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        phone: true,
        school_id: true,
        managed_schools: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    res.json({ success: true, data: user });
  }
);

export const createUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username, password, role, email, phone, school_id, managed_schools } = req.body;

    if (!username || !password || !role) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      res.status(400).json({ success: false, error: '用户名已存在' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        email,
        phone,
        school_id,
        managed_schools: managed_schools || [],
      },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        phone: true,
        school_id: true,
        managed_schools: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.json({ success: true, data: user });
  }
);

export const updateUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username, role, email, phone, school_id, managed_schools } = req.body;

    const data: any = {};
    if (username) data.username = username;
    if (role) data.role = role;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (school_id !== undefined) data.school_id = school_id;
    if (managed_schools !== undefined) data.managed_schools = managed_schools;

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        phone: true,
        school_id: true,
        managed_schools: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.json({ success: true, data: user });
  }
);

export const updateUserPassword = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ success: false, error: '密码不能为空' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: req.params.id as string },
      data: { password: hashedPassword },
    });

    res.json({ success: true });
  }
);

export const deleteUser = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    await prisma.user.delete({
      where: { id: req.params.id as string },
    });

    res.json({ success: true });
  }
);
