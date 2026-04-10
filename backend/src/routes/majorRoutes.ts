import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
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

export default router;
