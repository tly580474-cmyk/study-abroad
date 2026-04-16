import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores';
import { applicationService } from '../services/applicationService';
import { exportService } from '../services/exportService';
import type { ApplicationStatus } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, TrendingUp, CheckCircle, Clock, XCircle, FileText, X, FileDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface Stats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  bySchool: { school: string; count: number }[];
  recentTrend: number;
  monthlyData: { month: string; total: number; approved: number; rejected: number }[];
  statusTrend: { month: string; draft: number; submitted: number; pending_supplement: number; approved: number; completed: number; rejected: number; expired: number }[];
}

type CardType = 'total' | 'approvalRate' | 'pending' | 'trend' | null;

const statusConfig: { key: ApplicationStatus; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'draft', label: '草稿', icon: FileText, color: 'text-gray-600 bg-gray-100' },
  { key: 'submitted', label: '已提交', icon: Clock, color: 'text-blue-600 bg-blue-100' },
  { key: 'pending_supplement', label: '待补充', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-100' },
  { key: 'approved', label: '已通过', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  { key: 'completed', label: '已完成', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  { key: 'rejected', label: '已拒绝', icon: XCircle, color: 'text-red-600 bg-red-100' },
  { key: 'expired', label: '已过期', icon: Clock, color: 'text-gray-500 bg-gray-100' },
];

export function AnalyticsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardType>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    byStatus: {
      draft: 0,
      submitted: 0,
      pending_supplement: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      expired: 0,
    },
    bySchool: [],
    recentTrend: 0,
    monthlyData: [],
    statusTrend: [],
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const allData = await applicationService.getApplications({ pageSize: 500 });

      const byStatus: Record<ApplicationStatus, number> = {
        draft: 0,
        submitted: 0,
        pending_supplement: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        expired: 0,
      };

      const schoolMap: Record<string, number> = {};
      const monthlyMap: Record<string, { total: number; approved: number; rejected: number }> = {};
      const statusMonthlyMap: Record<string, Record<ApplicationStatus, number>> = {};

      allData.data.forEach((app) => {
        byStatus[app.status]++;
        const schoolName = app.major?.school?.name || '未知';
        schoolMap[schoolName] = (schoolMap[schoolName] || 0) + 1;

        const date = new Date(app.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { total: 0, approved: 0, rejected: 0 };
        }
        monthlyMap[monthKey].total++;
        if (app.status === 'approved' || app.status === 'completed') {
          monthlyMap[monthKey].approved++;
        }
        if (app.status === 'rejected') {
          monthlyMap[monthKey].rejected++;
        }

        if (!statusMonthlyMap[monthKey]) {
          statusMonthlyMap[monthKey] = {
            draft: 0,
            submitted: 0,
            pending_supplement: 0,
            approved: 0,
            completed: 0,
            rejected: 0,
            expired: 0,
          };
        }
        statusMonthlyMap[monthKey][app.status]++;
      });

      const monthlyData = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => {
          const date = new Date(month + '-01');
          return {
            month: `${date.getMonth() + 1}月`,
            ...data,
          };
        });

      const statusTrend = Object.entries(statusMonthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => {
          const date = new Date(month + '-01');
          return {
            month: `${date.getMonth() + 1}月`,
            ...data,
          };
        });

      const bySchool = Object.entries(schoolMap)
        .map(([school, count]) => ({ school, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentCount = allData.data.filter((app) => {
        const created = new Date(app.created_at);
        return created >= thirtyDaysAgo;
      }).length;

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const olderCount = allData.data.filter((app) => {
        const created = new Date(app.created_at);
        return created >= ninetyDaysAgo && created < thirtyDaysAgo;
      }).length;

      const trend = olderCount > 0 ? Math.round(((recentCount - olderCount) / olderCount) * 100) : 0;

      setStats({
        total: allData.total,
        byStatus,
        bySchool,
        recentTrend: trend,
        monthlyData,
        statusTrend,
      });
    } catch (err) {
      console.error('加载统计数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const approvalRate = stats.total > 0 ? Math.round(((stats.byStatus.approved + stats.byStatus.completed) / stats.total) * 100) : 0;

  if (user?.role !== 'analyst' && user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">无权限访问</h2>
            <p className="text-gray-600">只有数据分析师或系统管理员可以访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderDetailView = () => {
    if (!selectedCard) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {selectedCard === 'total' && '总申请数趋势'}
              {selectedCard === 'approvalRate' && '通过率趋势'}
              {selectedCard === 'pending' && '待审核趋势'}
              {selectedCard === 'trend' && '30天趋势详情'}
            </h3>
            <button onClick={() => setSelectedCard(null)} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6">
            {selectedCard === 'total' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">每月申请数量</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="总申请数" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="font-medium mb-4">各状态分布趋势</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.statusTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="draft" stroke="#6b7280" strokeWidth={2} name="草稿" />
                      <Line type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={2} name="已提交" />
                      <Line type="monotone" dataKey="pending_supplement" stroke="#eab308" strokeWidth={2} name="待补充" />
                      <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} name="已通过" />
                      <Line type="monotone" dataKey="completed" stroke="#16a34a" strokeWidth={2} name="已完成" />
                      <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} name="已拒绝" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedCard === 'approvalRate' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">每月通过与拒绝数量</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" fill="#22c55e" name="通过" />
                      <Bar dataKey="rejected" fill="#ef4444" name="拒绝" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">总通过数</p>
                    <p className="text-2xl font-bold text-green-700">{stats.byStatus.approved + stats.byStatus.completed}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">总拒绝数</p>
                    <p className="text-2xl font-bold text-red-700">{stats.byStatus.rejected}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedCard === 'pending' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">待审核申请趋势</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.statusTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={2} name="已提交" />
                      <Line type="monotone" dataKey="pending_supplement" stroke="#eab308" strokeWidth={2} name="待补充" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">待审核</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.byStatus.submitted}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-600">待补充</p>
                    <p className="text-2xl font-bold text-yellow-700">{stats.byStatus.pending_supplement}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedCard === 'trend' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">申请数量趋势</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="申请数" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">30天趋势</p>
                  <p className={`text-2xl font-bold ${stats.recentTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.recentTrend >= 0 ? '+' : ''}{stats.recentTrend}%
                  </p>
                  <p className="text-sm text-gray-500 mt-2">与前90天相比</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
          <p className="text-gray-500 mt-1">留学申请业务数据统计</p>
        </div>
        <Button
          onClick={() => exportService.exportApplications()}
          className="flex items-center gap-2"
        >
          <FileDown className="h-4 w-4" />
          导出报表
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setSelectedCard('total')}
          className="text-left"
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">总申请数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {loading ? '-' : stats.total}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setSelectedCard('approvalRate')}
          className="text-left"
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">通过率</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {loading ? '-' : `${approvalRate}%`}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 text-green-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setSelectedCard('pending')}
          className="text-left"
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">待审核</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {loading ? '-' : stats.byStatus.submitted + stats.byStatus.pending_supplement}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => setSelectedCard('trend')}
          className="text-left"
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">30天趋势</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {loading ? '-' : (
                      <span className={stats.recentTrend >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {stats.recentTrend >= 0 ? '+' : ''}{stats.recentTrend}%
                      </span>
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stats.recentTrend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>申请状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-gray-500">加载中...</div>
            ) : (
              <div className="space-y-4">
                {statusConfig.map((status) => {
                  const count = stats.byStatus[status.key] || 0;
                  const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={status.key} className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${status.color}`}>
                        <status.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{status.label}</span>
                          <span className="text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${status.color.replace('text-', 'bg-')}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>学校申请排名 (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-gray-500">加载中...</div>
            ) : stats.bySchool.length === 0 ? (
              <div className="py-8 text-center text-gray-500">暂无数据</div>
            ) : (
              <div className="space-y-3">
                {stats.bySchool.map((item, index) => {
                  const maxCount = stats.bySchool[0]?.count || 1;
                  const percentage = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.school} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{item.school}</span>
                          <span className="text-gray-500">{item.count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>关键指标</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">{loading ? '-' : stats.total}</p>
              <p className="text-sm text-gray-500 mt-1">总申请数</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{loading ? '-' : stats.byStatus.approved + stats.byStatus.completed}</p>
              <p className="text-sm text-gray-500 mt-1">已通过</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-600">{loading ? '-' : stats.byStatus.rejected}</p>
              <p className="text-sm text-gray-500 mt-1">已拒绝</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-yellow-600">{loading ? '-' : stats.byStatus.submitted}</p>
              <p className="text-sm text-gray-500 mt-1">待审核</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderDetailView()}
    </div>
  );
}
