import ExcelJS from 'exceljs';
import { PrismaClient, ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  pending_supplement: '待补充',
  approved: '已通过',
  completed: '已完成',
  rejected: '已拒绝',
  expired: '已过期',
};

export class ExportService {
  async exportApplicationsToExcel(filters?: {
    status?: ApplicationStatus;
    school_id?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ExcelJS.Workbook> {
    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.school_id) {
      where.major = { school_id: filters.school_id };
    }
    if (filters?.startDate || filters?.endDate) {
      where.created_at = {};
      if (filters.startDate) {
        where.created_at.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.created_at.lte = new Date(filters.endDate + 'T23:59:59');
      }
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        student: { select: { id: true, username: true, email: true, phone: true } },
        major: {
          include: {
            school: { select: { id: true, name: true, country: true, city: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '留学管理系统';
    workbook.created = new Date();

    const mainSheet = workbook.addWorksheet('申请总览');
    mainSheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '学生姓名', key: 'studentName', width: 15 },
      { header: '学生邮箱', key: 'studentEmail', width: 25 },
      { header: '学生电话', key: 'studentPhone', width: 15 },
      { header: '申请学校', key: 'schoolName', width: 20 },
      { header: '申请专业', key: 'majorName', width: 20 },
      { header: '申请状态', key: 'status', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 18 },
      { header: '更新时间', key: 'updatedAt', width: 18 },
    ];

    mainSheet.getRow(1).font = { bold: true };
    mainSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    applications.forEach((app, index) => {
      mainSheet.addRow({
        index: index + 1,
        studentName: app.student?.username || '未知',
        studentEmail: app.student?.email || '-',
        studentPhone: app.student?.phone || '-',
        schoolName: app.major?.school?.name || '未知',
        majorName: app.major?.name || '未知',
        status: STATUS_LABELS[app.status],
        createdAt: app.created_at.toLocaleString('zh-CN'),
        updatedAt: app.updated_at.toLocaleString('zh-CN'),
      });
    });

    const statusSheet = workbook.addWorksheet('状态统计');
    statusSheet.columns = [
      { header: '状态', key: 'status', width: 15 },
      { header: '数量', key: 'count', width: 12 },
      { header: '占比', key: 'percentage', width: 12 },
    ];
    statusSheet.getRow(1).font = { bold: true };
    statusSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const statusCounts: Record<string, number> = {};
    applications.forEach((app) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      statusSheet.addRow({
        status: STATUS_LABELS[status as ApplicationStatus] || status,
        count,
        percentage: `${((count / applications.length) * 100).toFixed(1)}%`,
      });
    });

    const schoolSheet = workbook.addWorksheet('学校统计');
    schoolSheet.columns = [
      { header: '学校名称', key: 'schoolName', width: 30 },
      { header: '国家', key: 'country', width: 15 },
      { header: '城市', key: 'city', width: 15 },
      { header: '申请数量', key: 'count', width: 12 },
      { header: '占比', key: 'percentage', width: 12 },
    ];
    schoolSheet.getRow(1).font = { bold: true };
    schoolSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const schoolCounts: Record<string, { count: number; country: string; city: string }> = {};
    applications.forEach((app) => {
      const schoolName = app.major?.school?.name || '未知';
      const schoolCountry = app.major?.school?.country || '-';
      const schoolCity = app.major?.school?.city || '-';
      if (!schoolCounts[schoolName]) {
        schoolCounts[schoolName] = { count: 0, country: schoolCountry, city: schoolCity };
      }
      schoolCounts[schoolName].count++;
    });

    Object.entries(schoolCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([schoolName, data]) => {
        schoolSheet.addRow({
          schoolName,
          country: data.country,
          city: data.city,
          count: data.count,
          percentage: `${((data.count / applications.length) * 100).toFixed(1)}%`,
        });
      });

    const summarySheet = workbook.addWorksheet('数据摘要');
    summarySheet.columns = [
      { header: '指标', key: 'metric', width: 25 },
      { header: '数值', key: 'value', width: 15 },
    ];
    summarySheet.getRow(1).font = { bold: true };

    const totalApplications = applications.length;
    const approvedCount = applications.filter(
      (a) => a.status === 'approved' || a.status === 'completed'
    ).length;
    const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
    const pendingCount = applications.filter(
      (a) => a.status === 'submitted' || a.status === 'pending_supplement'
    ).length;

    summarySheet.addRow({ metric: '报表生成时间', value: new Date().toLocaleString('zh-CN') });
    summarySheet.addRow({ metric: '筛选条件', value: filters ? JSON.stringify(filters) : '全部' });
    summarySheet.addRow({ metric: '总申请数', value: totalApplications });
    summarySheet.addRow({ metric: '已通过数', value: approvedCount });
    summarySheet.addRow({ metric: '已拒绝数', value: rejectedCount });
    summarySheet.addRow({ metric: '待审核数', value: pendingCount });
    summarySheet.addRow({
      metric: '总通过率',
      value: totalApplications > 0 ? `${((approvedCount / totalApplications) * 100).toFixed(1)}%` : '0%',
    });

    mainSheet.properties.tabColor = { argb: 'FF3B82F6' };
    statusSheet.properties.tabColor = { argb: 'FF22C55E' };
    schoolSheet.properties.tabColor = { argb: 'FFF59E0B' };
    summarySheet.properties.tabColor = { argb: 'FF6B7280' };

    return workbook;
  }

  async exportUsersToExcel(): Promise<ExcelJS.Workbook> {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
    });

    const schools = await prisma.school.findMany();
    const schoolMap = new Map(schools.map(s => [s.id, s.name]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '留学管理系统';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('用户列表');
    sheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '用户名', key: 'username', width: 15 },
      { header: '角色', key: 'role', width: 12 },
      { header: '邮箱', key: 'email', width: 25 },
      { header: '电话', key: 'phone', width: 15 },
      { header: '所属学校', key: 'schoolName', width: 20 },
      { header: '注册时间', key: 'createdAt', width: 18 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const ROLE_LABELS: Record<string, string> = {
      admin: '管理员',
      analyst: '数据分析师',
      counselor: '顾问',
      teacher: '老师',
      student: '学生',
    };

    users.forEach((user, index) => {
      sheet.addRow({
        index: index + 1,
        username: user.username,
        role: ROLE_LABELS[user.role] || user.role,
        email: user.email || '-',
        phone: user.phone || '-',
        schoolName: schoolMap.get(user.school_id || '') || '-',
        createdAt: user.created_at.toLocaleString('zh-CN'),
      });
    });

    return workbook;
  }
}

export const exportService = new ExportService();
