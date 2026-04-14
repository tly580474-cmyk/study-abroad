import { Response } from 'express';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { PostCategory, PostStatus } from '@prisma/client';

export const createPost = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { school_id, category, title, content } = req.body;
    const user = req.user!;

    if (!category || !title || !content) {
      res.status(400).json({ success: false, error: '缺少必填字段' });
      return;
    }

    if (!['student', 'school_admin', 'admin'].includes(user.role)) {
      res.status(403).json({ success: false, error: '无权创建帖子' });
      return;
    }

    const post = await prisma.forumPost.create({
      data: {
        user_id: user.userId,
        school_id: school_id || null,
        category: category as PostCategory,
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

export const getPosts = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category as string;
    const schoolId = req.query.school_id as string;
    const search = req.query.search as string;

    const where: any = {
      status: 'published',
    };

    if (category) {
      where.category = category;
    }
    if (schoolId) {
      where.school_id = schoolId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          school: { select: { id: true, name: true } },
          _count: { select: { comments: true, likes: true } },
        },
        orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.forumPost.count({ where }),
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

export const getPostById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true } },
        school: { select: { id: true, name: true } },
        _count: { select: { comments: true, likes: true } },
      },
    });

    if (!post) {
      res.status(404).json({ success: false, error: '帖子不存在' });
      return;
    }

    await prisma.forumPost.update({
      where: { id: postId },
      data: { views: { increment: 1 } },
    });

    res.json({ success: true, data: post });
  }
);

export const updatePost = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;
    const { title, content, category, school_id, is_pinned, is_premium, status } = req.body;
    const user = req.user!;

    const existingPost = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      res.status(404).json({ success: false, error: '帖子不存在' });
      return;
    }

    if (existingPost.user_id !== user.userId && user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权编辑此帖子' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category) updateData.category = category;
    if (school_id !== undefined) updateData.school_id = school_id;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_premium !== undefined) updateData.is_premium = is_premium;
    if (status) updateData.status = status;

    const post = await prisma.forumPost.update({
      where: { id: postId },
      data: updateData,
    });

    res.json({ success: true, data: post });
  }
);

export const deletePost = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;
    const user = req.user!;

    const existingPost = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      res.status(404).json({ success: false, error: '帖子不存在' });
      return;
    }

    if (existingPost.user_id !== user.userId && user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权删除此帖子' });
      return;
    }

    await prisma.forumPost.delete({ where: { id: postId } });

    res.json({ success: true, message: '帖子已删除' });
  }
);

export const toggleLike = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;
    const user = req.user!;

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      res.status(404).json({ success: false, error: '帖子不存在' });
      return;
    }

    const existingLike = await prisma.postLike.findUnique({
      where: {
        post_id_user_id: {
          post_id: postId,
          user_id: user.userId,
        },
      },
    });

    if (existingLike) {
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      res.json({ success: true, data: { liked: false } });
    } else {
      await prisma.postLike.create({
        data: {
          post_id: postId,
          user_id: user.userId,
        },
      });
      res.json({ success: true, data: { liked: true } });
    }
  }
);

export const addComment = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;
    const { content, parent_id } = req.body;
    const user = req.user!;

    if (!content) {
      res.status(400).json({ success: false, error: '评论内容不能为空' });
      return;
    }

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      res.status(404).json({ success: false, error: '帖子不存在' });
      return;
    }

    const comment = await prisma.postComment.create({
      data: {
        post_id: postId,
        user_id: user.userId,
        parent_id: parent_id || null,
        content,
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    res.json({ success: true, data: comment });
  }
);

export const getComments = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const postId = req.params.id as string;

    const comments = await prisma.postComment.findMany({
      where: { post_id: postId, parent_id: null },
      include: {
        user: { select: { id: true, username: true } },
        replies: {
          include: {
            user: { select: { id: true, username: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, data: comments });
  }
);

export const deleteComment = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const commentId = req.params.commentId as string;
    const user = req.user!;

    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      res.status(404).json({ success: false, error: '评论不存在' });
      return;
    }

    if (comment.user_id !== user.userId && user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权删除此评论' });
      return;
    }

    await prisma.postComment.delete({ where: { id: commentId } });

    res.json({ success: true, message: '评论已删除' });
  }
);

export const getMyPosts = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where: { user_id: user.userId },
        include: {
          school: { select: { id: true, name: true } },
          _count: { select: { comments: true, likes: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.forumPost.count({ where: { user_id: user.userId } }),
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