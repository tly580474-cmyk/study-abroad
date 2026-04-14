import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

export const getSchools = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: schools });
  }
);

export const getSchoolById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id as string },
    });
    if (!school) {
      res.status(404).json({ success: false, error: '学校不存在' });
      return;
    }
    res.json({ success: true, data: school });
  }
);

export const getSchoolWithMajors = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id as string },
      include: { majors: { orderBy: { name: 'asc' } } },
    });
    if (!school) {
      res.status(404).json({ success: false, error: '学校不存在' });
      return;
    }
    res.json({ success: true, data: school });
  }
);

export const createSchool = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, country, city, description } = req.body;
    if (!name || !country || !city) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }
    const school = await prisma.school.create({
      data: { name, country, city, description },
    });
    res.json({ success: true, data: school });
  }
);

export const updateSchool = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, country, city, description } = req.body;
    const school = await prisma.school.update({
      where: { id: req.params.id as string },
      data: { name, country, city, description },
    });
    res.json({ success: true, data: school });
  }
);

export const deleteSchool = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = req.params.id as string;

    const majorCount = await prisma.major.count({
      where: { school_id: schoolId },
    });

    if (majorCount > 0) {
      res.status(400).json({
        success: false,
        error: `该学校下存在 ${majorCount} 个专业，无法删除。请先删除所有专业。`,
      });
      return;
    }

    await prisma.school.delete({
      where: { id: schoolId },
    });
    res.json({ success: true, message: '学校已删除' });
  }
);
