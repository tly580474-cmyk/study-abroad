import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

export const createReview = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { school_id, rating, content } = req.body;
    const user = req.user!;

    if (user.role !== 'student') {
      res.status(403).json({ success: false, error: '仅学生可评价' });
      return;
    }

    if (!rating || !content || !school_id) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: '评分必须在1-5之间' });
      return;
    }

    const hasValidApplication = await prisma.application.findFirst({
      where: {
        student_id: user.userId,
        major: { school_id: school_id },
        status: 'completed',
      },
    });

    if (!hasValidApplication) {
      res.status(403).json({
        success: false,
        error: '您尚未完成该校申请，无法评价',
      });
      return;
    }

    const existingReview = await prisma.schoolReview.findUnique({
      where: {
        school_id_user_id: {
          school_id,
          user_id: user.userId,
        },
      },
    });

    if (existingReview) {
      res.status(400).json({
        success: false,
        error: '您已评价过该校，请编辑现有评价',
      });
      return;
    }

    const review = await prisma.schoolReview.create({
      data: {
        school_id,
        user_id: user.userId,
        rating,
        content,
      },
      include: {
        user: { select: { username: true } },
      },
    });

    res.json({ success: true, data: review });
  }
);

export const getSchoolReviews = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = req.params.schoolId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.schoolReview.findMany({
        where: { school_id: schoolId },
        include: {
          user: { select: { id: true, username: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.schoolReview.count({ where: { school_id: schoolId } }),
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export const getReviewStats = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = req.params.schoolId as string;

    const stats = await prisma.schoolReview.groupBy({
      by: ['rating'],
      where: { school_id: schoolId },
      _count: { rating: true },
    });

    const total = await prisma.schoolReview.count({
      where: { school_id: schoolId },
    });

    const avgRating =
      total > 0
        ? stats.reduce((sum, item) => sum + item.rating * item._count.rating, 0) /
          total
        : 0;

    const ratingDistribution = [0, 0, 0, 0, 0];
    stats.forEach((item) => {
      ratingDistribution[item.rating - 1] = item._count.rating;
    });

    res.json({
      success: true,
      data: {
        total,
        averageRating: Math.round(avgRating * 10) / 10,
        ratingDistribution,
      },
    });
  }
);

export const updateReview = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reviewId = req.params.id as string;
    const { rating, content } = req.body;
    const user = req.user!;

    const existingReview = await prisma.schoolReview.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      res.status(404).json({ success: false, error: '评价不存在' });
      return;
    }

    if (existingReview.user_id !== user.userId && user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权编辑此评价' });
      return;
    }

    if (rating && (rating < 1 || rating > 5)) {
      res.status(400).json({ success: false, error: '评分必须在1-5之间' });
      return;
    }

    const review = await prisma.schoolReview.update({
      where: { id: reviewId },
      data: {
        rating: rating || existingReview.rating,
        content: content || existingReview.content,
      },
    });

    res.json({ success: true, data: review });
  }
);

export const deleteReview = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reviewId = req.params.id as string;
    const user = req.user!;

    const existingReview = await prisma.schoolReview.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      res.status(404).json({ success: false, error: '评价不存在' });
      return;
    }

    if (existingReview.user_id !== user.userId && user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权删除此评价' });
      return;
    }

    await prisma.schoolReview.delete({ where: { id: reviewId } });

    res.json({ success: true, message: '评价已删除' });
  }
);

export const getMyReviews = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;

    const reviews = await prisma.schoolReview.findMany({
      where: { user_id: user.userId },
      include: {
        school: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, data: reviews });
  }
);