import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

export const createSchoolPost = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { school_id, type, title, content } = req.body;
    const user = req.user!;

    if (!school_id || !type || !title || !content) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    if (!['school_admin', 'admin'].includes(user.role)) {
      res.status(403).json({ success: false, error: '无权发布学校宣传' });
      return;
    }

    if (user.role === 'school_admin') {
      const school = await prisma.school.findUnique({
        where: { id: school_id },
      });
      if (!school || school.id !== user.school_id) {
        res.status(403).json({ success: false, error: '无权管理该校宣传' });
        return;
      }
    }

    const post = await prisma.schoolPost.create({
      data: {
        school_id,
        user_id: user.userId,
        type: type as any,
        title,
        content,
      },
      include: {
        user: { select: { id: true, username: true } },
        school: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: post });
  }
);

export const getSchoolPosts = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const schoolId = req.params.schoolId as string;
    const type = req.query.type as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      school_id: schoolId,
      status: 'published',
    };

    if (type) {
      where.type = type;
    }

    const [posts, total] = await Promise.all([
      prisma.schoolPost.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.schoolPost.count({ where }),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export const getSchoolPostById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;

    const post = await prisma.schoolPost.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true } },
        school: { select: { id: true, name: true } },
      },
    });

    if (!post) {
      res.status(404).json({ success: false, error: '宣传文章不存在' });
      return;
    }

    res.json({ success: true, data: post });
  }
);

export const updateSchoolPost = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;
    const { title, content, type, status } = req.body;
    const user = req.user!;

    const existingPost = await prisma.schoolPost.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      res.status(404).json({ success: false, error: '宣传文章不存在' });
      return;
    }

    if (user.role === 'school_admin') {
      if (existingPost.school_id !== user.school_id) {
        res.status(403).json({ success: false, error: '无权编辑此文章' });
        return;
      }
    } else if (user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权编辑此文章' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (type) updateData.type = type;
    if (status) updateData.status = status;

    const post = await prisma.schoolPost.update({
      where: { id: postId },
      data: updateData,
    });

    res.json({ success: true, data: post });
  }
);

export const deleteSchoolPost = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;
    const user = req.user!;

    const existingPost = await prisma.schoolPost.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      res.status(404).json({ success: false, error: '宣传文章不存在' });
      return;
    }

    if (user.role === 'school_admin') {
      if (existingPost.school_id !== user.school_id) {
        res.status(403).json({ success: false, error: '无权删除此文章' });
        return;
      }
    } else if (user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权删除此文章' });
      return;
    }

    await prisma.schoolPost.delete({ where: { id: postId } });

    res.json({ success: true, message: '宣传文章已删除' });
  }
);

export const getMySchoolPosts = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (user.role === 'school_admin') {
      where.school_id = user.school_id;
    } else if (user.role !== 'admin') {
      where.user_id = user.userId;
    }

    const [posts, total] = await Promise.all([
      prisma.schoolPost.findMany({
        where,
        include: {
          school: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.schoolPost.count({ where }),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);