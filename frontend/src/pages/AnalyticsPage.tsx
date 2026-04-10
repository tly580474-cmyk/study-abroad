import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores';
import { applicationService } from '../services/applicationService';
import type { ApplicationStatus } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { AlertCircle, TrendingUp, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

interface Stats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  bySchool: { school: string; count: number }[];
  recentTrend: number;
}

export function AnalyticsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
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

      allData.data.forEach((app) => {
        byStatus[app.status]++;
        const schoolName = app.major?.school?.name || '未知';
        schoolMap[schoolName] = (schoolMap[schoolName] || 0) + 1;
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
      });
    } catch (err) {
      console.error('加载统计数据失败', err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: { label: string; icon: React.ElementType; color: string }[] = [
    { label: '草稿', icon: FileText, color: 'text-gray-600 bg-gray-100' },
    { label: '已提交', icon: Clock, color: 'text-blue-600 bg-blue-100' },
    { label: '待补充', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-100' },
    { label: '已通过', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { label: '已完成', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { label: '已拒绝', icon: XCircle, color: 'text-red-600 bg-red-100' },
    { label: '已过期', icon: Clock, color: 'text-gray-500 bg-gray-100' },
  ];

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
        <p className="text-gray-500 mt-1">留学申请业务数据统计</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
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

        <Card>
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

        <Card>
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

        <Card>
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
                  const count = stats.byStatus[status.label as keyof typeof stats.byStatus] || 0;
                  const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={status.label} className="flex items-center gap-4">
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
                            className={`h-full rounded-full ${status.color.split(' ')[1]}`}
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
    </div>
  );
}
