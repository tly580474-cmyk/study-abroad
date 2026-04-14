import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const where = req.query.school_id ? { school_id: req.query.school_id as string } : {};

  const majors = await prisma.major.findMany({
    where,
    include: {
      school: { select: { id: true, name: true, country: true, city: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: majors });
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const major = await prisma.major.findUnique({
    where: { id: req.params.id as string },
    include: {
      school: true,
    },
  });
  if (!major) {
    res.status(404).json({ success: false, error: '专业不存在' });
    return;
  }
  res.json({ success: true, data: major });
}));

router.post('/', authorize('admin', 'school_admin'), asyncHandler(async (req: AuthRequest, res) => {
  const { school_id, name, quota, tuition, requirements } = req.body;

  if (req.user!.role === 'school_admin') {
    if (!req.user!.school_id || school_id !== req.user!.school_id) {
      res.status(403).json({ success: false, error: '只能管理本校专业' });
      return;
    }
  }

  const major = await prisma.major.create({
    data: {
      school_id,
      name,
      quota: parseInt(quota) || 0,
      tuition: parseFloat(tuition) || 0,
      requirements,
    },
    include: {
      school: { select: { id: true, name: true } },
    },
  });
  res.status(201).json({ success: true, data: major });
}));

router.put('/:id', authorize('admin', 'school_admin'), asyncHandler(async (req: AuthRequest, res) => {
  const { name, quota, tuition, requirements } = req.body;
  const id = req.params.id as string;

  const existing = await prisma.major.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: '专业不存在' });
    return;
  }

  if (req.user!.role === 'school_admin') {
    if (req.user!.school_id !== existing.school_id) {
      res.status(403).json({ success: false, error: '只能管理本校专业' });
      return;
    }
  }

  const major = await prisma.major.update({
    where: { id },
    data: {
      name,
      quota: quota !== undefined ? parseInt(quota) : undefined,
      tuition: tuition !== undefined ? parseFloat(tuition) : undefined,
      requirements,
    },
    include: {
      school: { select: { id: true, name: true } },
    },
  });
  res.json({ success: true, data: major });
}));

router.delete('/:id', authorize('admin', 'school_admin'), asyncHandler(async (req: AuthRequest, res) => {
  const id = req.params.id as string;

  const existing = await prisma.major.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: '专业不存在' });
    return;
  }

  if (req.user!.role === 'school_admin') {
    if (req.user!.school_id !== existing.school_id) {
      res.status(403).json({ success: false, error: '只能管理本校专业' });
      return;
    }
  }

  const applicationCount = await prisma.application.count({
    where: { major_id: id },
  });

  if (applicationCount > 0) {
    res.status(400).json({ success: false, error: '该专业下存在申请记录，无法删除' });
    return;
  }

  await prisma.major.delete({ where: { id } });
  res.json({ success: true, message: '专业已删除' });
}));

export default router;
