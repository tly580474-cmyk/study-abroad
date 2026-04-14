import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

const decodeFileName = (fileName: string): string => {
  try {
    return decodeURIComponent(escape(fileName));
  } catch {
    try {
      const buffer = Buffer.from(fileName, 'latin1');
      return buffer.toString('utf8');
    } catch {
      return fileName;
    }
  }
};

export const getDocuments = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const applicationId = req.params.applicationId as string;

    const documents = await prisma.document.findMany({
      where: { application_id: applicationId },
      select: {
        id: true,
        name: true,
        size: true,
        mime_type: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const fixedDocuments = documents.map(doc => ({
      ...doc,
      name: fixEncoding(doc.name),
    }));

    res.json({ success: true, data: fixedDocuments });
  }
);

const fixEncoding = (fileName: string): string => {
  if (!fileName) return fileName;
  if (/[\x00-\x7F]/.test(fileName) && !fileName.includes('�')) {
    return fileName;
  }
  try {
    const buffer = Buffer.from(fileName, 'latin1');
    return buffer.toString('utf8');
  } catch {
    return fileName;
  }
};

export const fixAllDocumentNames = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: '仅管理员可执行此操作' });
      return;
    }

    const documents = await prisma.document.findMany();

    let fixedCount = 0;
    for (const doc of documents) {
      const fixedName = fixEncoding(doc.name);
      if (fixedName !== doc.name) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { name: fixedName },
        });
        fixedCount++;
      }
    }

    res.json({ success: true, message: `已修复 ${fixedCount} 个文件名` });
  }
);

export const getDocumentPreview = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ success: false, error: '文档不存在' });
      return;
    }

    const base64Data = document.data.toString('base64');
    const dataUrl = `data:${document.mime_type};base64,${base64Data}`;

    res.json({
      success: true,
      data: {
        name: fixEncoding(document.name),
        mimeType: document.mime_type,
        dataUrl,
      },
    });
  }
);

export const uploadDocument = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: '请选择要上传的文件' });
      return;
    }

    const applicationId = req.params.applicationId as string;
    const { name } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      res.status(404).json({ success: false, error: '申请不存在' });
      return;
    }

    if (application.student_id !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权限上传此申请的材料' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        application_id: applicationId,
        name: name || decodeFileName(req.file.originalname),
        data: req.file.buffer,
        size: req.file.size,
        mime_type: req.file.mimetype,
        status: 'uploaded',
      },
      select: {
        id: true,
        name: true,
        size: true,
        mime_type: true,
        status: true,
        created_at: true,
      },
    });

    res.status(201).json({ success: true, data: document });
  }
);

export const getDocumentById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ success: false, error: '文档不存在' });
      return;
    }

    res.setHeader('Content-Type', document.mime_type);
    const encodedFileName = encodeURIComponent(document.name);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}; filename="${encodedFileName}"`);
    res.send(document.data);
  }
);

export const deleteDocument = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!document) {
      res.status(404).json({ success: false, error: '文档不存在' });
      return;
    }

    if (document.application.student_id !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权限删除此文档' });
      return;
    }

    await prisma.document.delete({ where: { id } });

    res.json({ success: true, message: '文档已删除' });
  }
);
