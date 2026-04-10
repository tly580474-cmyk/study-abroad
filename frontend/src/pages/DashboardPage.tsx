import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { applicationService } from '../services/applicationService';
import type { Application, ApplicationStatus } from '../types';
import {
  FileText,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  XCircle,
  Building,
  TrendingUp,
  Users,
  GraduationCap,
} from 'lucide-react';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  submitted: { label: '已提交', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  pending_supplement: { label: '待补充', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: '已通过', color: 'text-green-700', bgColor: 'bg-green-100' },
  completed: { label: '已完成', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: '已拒绝', color: 'text-red-700', bgColor: 'bg-red-100' },
  expired: { label: '已过期', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [allData, pendingData, approvedData, rejectedData] = await Promise.all([
        applicationService.getApplications({ pageSize: 100 }),
        applicationService.getApplications({ status: 'submitted', pageSize: 100 }),
        applicationService.getApplications({ status: 'approved', pageSize: 100 }),
        applicationService.getApplications({ status: 'rejected', pageSize: 100 }),
      ]);

      setStats({
        total: allData.total,
        pending: pendingData.total,
        approved: approvedData.total,
        rejected: rejectedData.total,
      });

      setRecentApplications(allData.data.slice(0, 5));
    } catch (err) {
      console.error('加载仪表盘数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleSpecificContent = () => {
    switch (user?.role) {
      case 'student':
        return {
          title: '欢迎回来',
          subtitle: '以下是您的留学申请概览',
          stats: [
            { label: '我的申请', value: stats.total, icon: FileText, color: 'text-blue-600' },
            { label: '待审核', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
            { label: '已通过', value: stats.approved, icon: CheckCircle, color: 'text-green-600' },
            { label: '已拒绝', value: stats.rejected, icon: XCircle, color: 'text-red-600' },
          ],
          quickActions: [
            { label: '新建申请', desc: '提交新的留学申请', icon: Plus, path: '/applications/new' },
            { label: '我的申请', desc: '查看所有申请', icon: FileText, path: '/applications' },
          ],
        };
      case 'reviewer':
        return {
          title: '审查工作台',
          subtitle: '以下是待审核申请概览',
          stats: [
            { label: '待审核', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
            { label: '已审核', value: stats.approved + stats.rejected, icon: CheckCircle, color: 'text-green-600' },
            { label: '已通过', value: stats.approved, icon: CheckCircle, color: 'text-green-600' },
            { label: '已拒绝', value: stats.rejected, icon: XCircle, color: 'text-red-600' },
          ],
          quickActions: [
            { label: '审核申请', desc: '查看待审核列表', icon: Eye, path: '/review' },
            { label: '申请列表', desc: '查看所有申请', icon: FileText, path: '/applications' },
          ],
        };
      case 'approver':
        return {
          title: '批复工作台',
          subtitle: '以下是待批复申请概览',
          stats: [
            { label: '待批复', value: stats.approved, icon: Clock, color: 'text-yellow-600' },
            { label: '已完成', value: stats.total, icon: CheckCircle, color: 'text-green-600' },
            { label: '总申请数', value: stats.total, icon: FileText, color: 'text-blue-600' },
            { label: '通过率', value: stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : '0%', icon: TrendingUp, color: 'text-green-600' },
          ],
          quickActions: [
            { label: '批复申请', desc: '确认占位操作', icon: CheckCircle, path: '/approval' },
            { label: '申请列表', desc: '查看所有申请', icon: FileText, path: '/applications' },
          ],
        };
      case 'school_admin':
        return {
          title: '学校管理',
          subtitle: '本校申请概览',
          stats: [
            { label: '本校申请', value: stats.total, icon: GraduationCap, color: 'text-blue-600' },
            { label: '待审核', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
            { label: '已通过', value: stats.approved, icon: CheckCircle, color: 'text-green-600' },
            { label: '专业管理', value: '-', icon: Building, color: 'text-purple-600' },
          ],
          quickActions: [
            { label: '学校管理', desc: '维护学校和专业', icon: Building, path: '/schools' },
            { label: '申请列表', desc: '查看所有申请', icon: FileText, path: '/applications' },
          ],
        };
      case 'analyst':
        return {
          title: '数据分析',
          subtitle: '业务数据统计',
          stats: [
            { label: '总申请数', value: stats.total, icon: FileText, color: 'text-blue-600' },
            { label: '通过率', value: stats.total > 0 ? `${Math.round((stats.approved / stats.total) * 100)}%` : '0%', icon: TrendingUp, color: 'text-green-600' },
            { label: '待审核', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
            { label: '已拒绝', value: stats.rejected, icon: XCircle, color: 'text-red-600' },
          ],
          quickActions: [
            { label: '数据统计', desc: '查看详细报表', icon: TrendingUp, path: '/analytics' },
            { label: '申请列表', desc: '查看所有申请', icon: FileText, path: '/applications' },
          ],
        };
      case 'admin':
      default:
        return {
          title: '系统管理',
          subtitle: '系统运行概览',
          stats: [
            { label: '总申请数', value: stats.total, icon: FileText, color: 'text-blue-600' },
            { label: '待审核', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
            { label: '已通过', value: stats.approved, icon: CheckCircle, color: 'text-green-600' },
            { label: '系统用户', value: '-', icon: Users, color: 'text-purple-600' },
          ],
          quickActions: [
            { label: '用户管理', desc: '管理系统用户', icon: Users, path: '/users' },
            { label: '申请列表', desc: '查看所有申请', icon: FileText, path: '/applications' },
          ],
        };
    }
  };

  const content = getRoleSpecificContent();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{content.title}，{user?.username}</h1>
        <p className="text-gray-500 mt-1">{content.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {content.stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? '-' : stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近申请</h2>
            <button
              onClick={() => navigate('/applications')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              查看全部
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-500">加载中...</div>
          ) : recentApplications.length === 0 ? (
            <div className="py-8 text-center text-gray-500">暂无申请数据</div>
          ) : (
            <div className="space-y-4">
              {recentApplications.map((app) => {
                const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer rounded-lg px-2 -mx-2 transition-colors"
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {app.major?.school?.name || '未知学校'} - {app.major?.name || '未知专业'}
                      </p>
                      <p className="text-sm text-gray-500">
                        申请人: {app.student?.username || '-'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 gap-3">
            {content.quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors cursor-pointer"
              >
                <action.icon className="h-5 w-5 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">{action.label}</p>
                <p className="text-sm text-gray-500">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
