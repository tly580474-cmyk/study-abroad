import { Response } from 'express';
import { Prisma, ApplicationStatus } from '@prisma/client';
import prisma from '../utils/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';
import { buildResourceFilter } from '../services/permissionService.js';
import {
  CreateApplicationSchema,
  CreateReviewSchema,
  CreateApprovalSchema,
} from '../services/schemas.js';

export const getApplications = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = (page - 1) * pageSize;

    const resourceFilter = buildResourceFilter(req.user, 'application');
    const statusFilter = req.query.status ? { status: req.query.status as ApplicationStatus } : {};

    const where = {
      ...resourceFilter,
      ...statusFilter,
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          student: { select: { id: true, username: true, email: true } },
          major: {
            include: { school: { select: { id: true, name: true } } },
          },
          reviews: { include: { reviewer: { select: { id: true, username: true } } } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    res.json({
      success: true,
      data: applications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
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

const fixDocumentsEncoding = (documents: any[]): any[] => {
  return documents.map(doc => ({
    ...doc,
    name: fixEncoding(doc.name),
  }));
};

export const getApplicationById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, username: true, email: true, phone: true } },
        major: { include: { school: true } },
        reviews: { include: { reviewer: { select: { id: true, username: true } } } },
        approvals: { include: { approver: { select: { id: true, username: true } } } },
        documents: true,
      },
    });

    if (!application) {
      res.status(404).json({ success: false, error: '申请不存在' });
      return;
    }

    const fixedApplication = {
      ...application,
      documents: fixDocumentsEncoding(application.documents),
    };

    res.json({ success: true, data: fixedApplication });
  }
);

export const createApplication = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const { major_id } = CreateApplicationSchema.parse(req.body);

    const application = await prisma.application.create({
      data: {
        student_id: req.user.userId,
        major_id,
        status: 'draft',
      },
      include: {
        major: { include: { school: true } },
      },
    });

    res.status(201).json({ success: true, data: application });
  }
);

export const submitApplication = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      res.status(404).json({ success: false, error: '申请不存在' });
      return;
    }

    if (application.student_id !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权限操作此申请' });
      return;
    }

    if (application.status !== 'draft' && application.status !== 'pending_supplement') {
      res.status(400).json({ success: false, error: '当前状态不允许提交' });
      return;
    }

    const documentCount = await prisma.document.count({
      where: { application_id: id },
    });

    if (documentCount === 0) {
      res.status(400).json({
        success: false,
        error: '请先上传申请材料后再提交',
      });
      return;
    }

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status: 'submitted',
        applied_at: new Date(),
      },
    });

    res.json({ success: true, data: updatedApplication });
  }
);

export const withdrawApplication = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      res.status(404).json({ success: false, error: '申请不存在' });
      return;
    }

    if (application.student_id !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权限操作此申请' });
      return;
    }

    if (application.status !== 'submitted') {
      res.status(400).json({ success: false, error: '当前状态不允许撤回' });
      return;
    }

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status: 'draft',
        applied_at: null,
      },
    });

    res.json({ success: true, data: updatedApplication });
  }
);

export const deleteApplication = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      res.status(404).json({ success: false, error: '申请不存在' });
      return;
    }

    if (application.student_id !== req.user.userId && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: '无权限删除此申请' });
      return;
    }

    if (application.status !== 'draft') {
      res.status(400).json({ success: false, error: '仅草稿状态的申请可删除' });
      return;
    }

    await prisma.$transaction([
      prisma.document.deleteMany({ where: { application_id: id } }),
      prisma.application.delete({ where: { id } }),
    ]);

    res.json({ success: true, message: '申请已删除' });
  }
);

export const reviewApplication = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;
    const { action, comment } = CreateReviewSchema.parse(req.body);

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      res.status(404).json({ success: false, error: '申请不存在' });
      return;
    }

    if (application.status !== 'submitted') {
      res.status(400).json({ success: false, error: '当前状态不允许审核' });
      return;
    }

    let newStatus: ApplicationStatus;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'request_resubmit':
        newStatus = 'pending_supplement';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
    }

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status: newStatus,
        reviewed_at: new Date(),
        reviewer_id: req.user.userId,
        ...(action === 'request_resubmit' && {
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      },
    });

    await prisma.review.create({
      data: {
        application_id: id,
        reviewer_id: req.user.userId,
        action,
        comment,
      },
    });

    res.json({ success: true, data: updatedApplication });
  }
);

export const approveApplication = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未授权' });
      return;
    }

    const id = req.params.id as string;
    const { notes } = CreateApprovalSchema.parse(req.body);

    const application = await prisma.application.findUnique({
      where: { id },
      include: { major: true },
    });

    if (!application) {
      res.status(404).json({ success: false, error: '申请不存在' });
      return;
    }

    if (application.status !== 'approved') {
      res.status(400).json({ success: false, error: '当前状态不允许批复' });
      return;
    }

    if (application.major.enrolled >= application.major.quota) {
      res.status(400).json({ success: false, error: '该专业名额已满' });
      return;
    }

    const [updatedApplication] = await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: {
          status: 'completed',
          approved_at: new Date(),
        },
      }),
      prisma.major.update({
        where: { id: application.major_id },
        data: { enrolled: { increment: 1 } },
      }),
      prisma.approval.create({
        data: {
          application_id: id,
          approver_id: req.user.userId,
          notes,
        },
      }),
    ]);

    res.json({ success: true, data: updatedApplication });
  }
);
