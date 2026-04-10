import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { applicationService } from '../services/applicationService';
import type { Application, ApplicationStatus, ReviewAction } from '../types';
import { useAuthStore } from '../stores';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Building,
  BookOpen,
  Calendar,
  MessageSquare,
} from 'lucide-react';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700', icon: FileText },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-700', icon: Clock },
  pending_supplement: { label: '待补充', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: '已过期', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadApplication();
    }
  }, [id]);

  const loadApplication = async () => {
    setLoading(true);
    try {
      const data = await applicationService.getApplicationById(id!);
      setApplication(data);
    } catch {
      setError('加载申请详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: ReviewAction) => {
    if (!application) return;

    if (action === 'request_resubmit' && !comment.trim()) {
      setError('请填写补充说明');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      await applicationService.reviewApplication(application.id, action, comment);
      await loadApplication();
      setComment('');
    } catch (err: any) {
      setError(err?.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!application) return;

    setActionLoading(true);
    setError('');
    try {
      await applicationService.approveApplication(application.id, comment);
      await loadApplication();
    } catch (err: any) {
      setError(err?.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">申请不存在</h2>
            <Button variant="outline" onClick={() => navigate('/applications')}>
              返回列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const canReview = user?.role === 'reviewer' && application.status === 'submitted';
  const canApprove = user?.role === 'approver' && application.status === 'approved';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/applications')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回申请列表
      </button>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>申请详情</span>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {statusConfig.label}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">学校</div>
                    <div className="font-medium">{application.major?.school?.name}</div>
                    <div className="text-sm text-gray-500">
                      {application.major?.school?.country} {application.major?.school?.city}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">专业</div>
                    <div className="font-medium">{application.major?.name}</div>
                    {application.major?.tuition && (
                      <div className="text-sm text-gray-500">
                        学费: ${application.major.tuition}/年
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {application.major?.requirements && (
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500 mb-1">申请要求</div>
                  <div className="text-sm text-gray-700">{application.major.requirements}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {(application.reviews?.length || application.approvals?.length) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  审核记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {application.reviews?.map((review) => (
                    <div key={review.id} className="flex gap-3">
                      <div className="mt-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.reviewer?.username}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              review.action === 'approve'
                                ? 'bg-green-100 text-green-700'
                                : review.action === 'reject'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {review.action === 'approve'
                              ? '通过'
                              : review.action === 'reject'
                              ? '拒绝'
                              : '要求补充'}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {application.approvals?.map((approval) => (
                    <div key={approval.id} className="flex gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{approval.approver?.username}</span>
                          <span className="text-sm text-gray-500">
                            {new Date(approval.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        {approval.notes && (
                          <p className="mt-2 text-sm text-gray-600">{approval.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                申请人
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-gray-500">用户名</div>
                  <div className="font-medium">{application.student?.username}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">邮箱</div>
                  <div className="text-sm">{application.student?.email || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">电话</div>
                  <div className="text-sm">{application.student?.phone || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                时间线
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">创建时间</span>
                  <span>{new Date(application.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                {application.applied_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">提交时间</span>
                    <span>{new Date(application.applied_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                )}
                {application.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">审核时间</span>
                    <span>{new Date(application.reviewed_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                )}
                {application.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">批复时间</span>
                    <span>{new Date(application.approved_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {canReview && (
            <Card>
              <CardHeader>
                <CardTitle>审核操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    审核意见
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入审核意见..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleReview('request_resubmit')}
                    disabled={actionLoading}
                  >
                    要求补充
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleReview('reject')}
                    disabled={actionLoading}
                  >
                    拒绝
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleReview('approve')}
                  disabled={actionLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  通过
                </Button>
              </CardContent>
            </Card>
          )}

          {canApprove && (
            <Card>
              <CardHeader>
                <CardTitle>批复操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">批复备注</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入批复备注..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                  />
                </div>
                <Button className="w-full" onClick={handleApprove} disabled={actionLoading}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  确认占位
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
