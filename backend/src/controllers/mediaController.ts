import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const imageFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持JPG/PNG/GIF/WebP格式'));
  }
};

const videoFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['video/mp4', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持MP4/WebM格式'));
  }
};

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_DIR, 'images'));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_DIR, 'videos'));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: videoFilter,
});

export const uploadImage = [
  authenticate,
  authorize('school_admin', 'admin'),
  imageUpload.single('image'),
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: '未上传图片' });
      return;
    }

    const url = `/uploads/images/${req.file.filename}`;

    const media = await prisma.media.create({
      data: {
        user_id: req.user!.userId,
        type: 'image',
        url,
        filename: req.file.originalname,
        size: req.file.size,
        mime_type: req.file.mimetype,
      },
    });

    res.json({ success: true, data: { url, media } });
  }),
];

export const uploadVideo = [
  authenticate,
  authorize('school_admin', 'admin'),
  videoUpload.single('video'),
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, error: '未上传视频' });
      return;
    }

    const url = `/uploads/videos/${req.file.filename}`;

    const media = await prisma.media.create({
      data: {
        user_id: req.user!.userId,
        type: 'video',
        url,
        filename: req.file.originalname,
        size: req.file.size,
        mime_type: req.file.mimetype,
      },
    });

    res.json({ success: true, data: { url, media } });
  }),
];

export const getMediaList = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const user = req.user!;
    const type = req.query.type as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: { user_id: string; type?: 'image' | 'video' } = { user_id: user.userId };
    if (type && ['image', 'video'].includes(type)) {
      where.type = type as 'image' | 'video';
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.media.count({ where }),
    ]);

    res.json({
      success: true,
      data: media,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export const deleteMedia = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const mediaId = req.params.id as string;
    const user = req.user!;

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      res.status(404).json({ success: false, error: '媒体文件不存在' });
      return;
    }

    if (media.user_id !== user.userId && user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权删除此文件' });
      return;
    }

    await prisma.media.delete({ where: { id: mediaId } });

    res.json({ success: true, message: '媒体文件已删除' });
  }
);

export const embedYouTubeUrl = (input: string): string => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
    }
  }

  return input;
};