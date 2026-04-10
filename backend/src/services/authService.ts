import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JwtPayload, Role } from '../types/index.js';

const prisma = new PrismaClient();

export class AuthService {
  async register(
    username: string,
    password: string,
    role: Role,
    email?: string,
    phone?: string
  ) {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        email,
        phone,
      },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        phone: true,
        created_at: true,
      },
    });

    return user;
  }

  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('用户名或密码错误');
    }

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      school_id: user.school_id ?? undefined,
      managed_schools: user.managed_schools ?? undefined,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', {
      expiresIn: '7d',
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        phone: true,
        school_id: true,
        managed_schools: true,
        created_at: true,
      },
    });

    return user;
  }
}

export const authService = new AuthService();
