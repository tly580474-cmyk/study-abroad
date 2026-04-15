import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000;
const MAX_CODE_PER_5MINUTES = 3;
const MAX_VERIFY_ATTEMPTS = 5;
const LOCK_DURATION = 60 * 60 * 1000;

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.163.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export class EmailService {
  async sendVerificationCode(email: string, type: 'REGISTER' | 'RESET_PASSWORD'): Promise<{ success: boolean; message: string; retryAfter?: number }> {
    if (!isValidEmail(email)) {
      return { success: false, message: '邮箱格式不正确' };
    }

    const recentCodes = await prisma.emailVerification.findMany({
      where: {
        email,
        type,
        created_at: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      orderBy: { created_at: 'desc' },
    });

    if (recentCodes.length >= MAX_CODE_PER_5MINUTES) {
      const retryAfter = 300 - Math.floor((Date.now() - recentCodes[0].created_at.getTime()) / 1000);
      return {
        success: false,
        message: '发送过于频繁，请稍后再试',
        retryAfter: Math.max(0, retryAfter),
      };
    }

    const code = generateCode();
    const expires_at = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);

    await prisma.emailVerification.updateMany({
      where: { email, type, used: false },
      data: { used: true },
    });

    await prisma.emailVerification.create({
      data: { email, code, type, expires_at },
    });

    const transporter = await createTransporter();

    const subject = type === 'REGISTER' ? '【留学管理系统】注册邮箱验证码' : '【留学管理系统】找回密码验证码';

    await transporter.sendMail({
      from: `"留学管理系统" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">邮箱验证</h2>
          <p style="color: #555; font-size: 16px;">您好，</p>
          <p style="color: #555; font-size: 16px;">
            您正在${type === 'REGISTER' ? '注册留学管理系统账号' : '找回密码'}。
          </p>
          <p style="font-size: 32px; font-weight: bold; color: #0066cc; text-align: center; margin: 30px 0;">
            ${code}
          </p>
          <p style="color: #666; font-size: 14px;">
            验证码将在 ${VERIFICATION_CODE_EXPIRY / 60000} 分钟后过期。
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            如果您没有进行此操作，请忽略此邮件。
          </p>
        </div>
      `,
    });

    return {
      success: true,
      message: '验证码已发送',
    };
  }

  async verifyCode(email: string, code: string, type: 'REGISTER' | 'RESET_PASSWORD'): Promise<{ success: boolean; message: string; verificationId?: string }> {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!verification) {
      return { success: false, message: '验证码错误或已过期' };
    }

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    });

    return {
      success: true,
      message: '验证成功',
      verificationId: verification.id,
    };
  }

  async registerWithEmail(
    username: string,
    password: string,
    email: string,
    code: string
  ): Promise<{ success: boolean; message: string; user?: any; token?: string }> {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        type: 'REGISTER',
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!verification) {
      return { success: false, message: '验证码错误或已过期' };
    }

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { used: true },
    });

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return { success: false, message: '用户名已被注册' };
    }

    const existingEmail = await prisma.user.findFirst({ where: { email } });
    if (existingEmail) {
      return { success: false, message: '该邮箱已被注册' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        email_verified: true,
        role: 'student',
      },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        created_at: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return { success: true, message: '注册成功', user, token };
  }
}

export const emailService = new EmailService();
