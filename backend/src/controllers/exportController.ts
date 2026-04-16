import { Response } from 'express';
import { exportService } from '../services/exportService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthRequest } from '../middleware/auth.js';

export const exportApplications = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, school_id, startDate, endDate } = req.query;

    const filters: any = {};
    if (status) filters.status = status as any;
    if (school_id) filters.school_id = school_id as string;
    if (startDate) filters.startDate = startDate as string;
    if (endDate) filters.endDate = endDate as string;

    const workbook = await exportService.exportApplicationsToExcel(filters);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=applications_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }
);

export const exportUsers = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const workbook = await exportService.exportUsersToExcel();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=users_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }
);
