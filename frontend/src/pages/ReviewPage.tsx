import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ModalHeader, ModalBody } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores';
import apiClient from '../services/api';
import type { ApplicationStatus, ReviewAction } from '../types';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: '草稿', color: 'gray', icon: <FileText className="h-4 w-4" /> },
  submitted: { label: '待审核', color: 'yellow', icon: <Clock className="h-4 w-4" /> },
  pending_supplement: { label: '待补充', color: 'orange', icon: <AlertCircle className="h-4 w-4" /> },
  approved: { label: '已通过', color: 'green', icon: <CheckCircle className="h-4 w-4" /> },
  completed: { label: '已完成', color: 'green', icon: <CheckCircle className="h-4 w-4" /> },
  rejected: { label: '已拒绝', color: 'red', icon: <XCircle className="h-4 w-4" /> },
  expired: { label: '已过期', color: 'red', icon: <XCircle className="h-4 w-4" /> },
};

interface Application {
  id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  reviewed_at: string | null;
  deadline: string | null;
  created_at: string;
  student: { id: string; username: string; email?: string };
  major: { id: string; name: string; school: { id: string; name: string } };
  reviews: Array<{
    id: string;
    action: ReviewAction;
    comment?: string;
    created_at: string;
    reviewer: { id: string; username: string };
  }>;
}

export function ReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewAction | ''>('');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/applications', {
        params: { status: 'submitted', pageSize: 100 },
      });
      setApplications(response.data.data);
    } catch (err) {
      console.error('加载申请列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'reviewer' && user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadApplications();
  }, [user, navigate]);

  const handleReview = async () => {
    if (!selectedApp || !reviewAction) return;

    setSubmitting(true);
    try {
      await apiClient.post(`/applications/${selectedApp.id}/review`, {
        action: reviewAction,
        comment: reviewComment || undefined,
      });
      setReviewModalOpen(false);
      setSelectedApp(null);
      setReviewAction('');
      setReviewComment('');
      loadApplications();
    } catch (err: any) {
      alert(err?.response?.data?.error || '审核操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (app: Application, action: ReviewAction) => {
    setSelectedApp(app);
    setReviewAction(action);
    setReviewModalOpen(true);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">审查工作台</h1>
        <p className="text-gray-500 mt-1">审核学生提交的留学申请</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">待审核申请</span>
            <Badge variant="yellow">{applications.length}</Badge>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
            <p>暂无待审核申请</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">{app.student.username}</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">{app.student.email || '无邮箱'}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      申请学校：{app.major.school.name}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      申请专业：{app.major.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      提交时间：{formatDate(app.applied_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={STATUS_CONFIG[app.status].color as any}>
                      {STATUS_CONFIG[app.status].label}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedApp(app); setDetailModalOpen(true); }}
                      >
                        查看详情
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewModal(app, 'approve')}
                      >
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewModal(app, 'request_resubmit')}
                      >
                        要求补充
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openReviewModal(app, 'reject')}
                      >
                        拒绝
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); setSelectedApp(null); setReviewAction(''); }}
      >
        <ModalHeader onClose={() => { setReviewModalOpen(false); setSelectedApp(null); setReviewAction(''); }}>
          审核操作
        </ModalHeader>
        <ModalBody>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">申请人：{selectedApp?.student.username}</p>
            <p className="text-sm text-gray-600 mb-2">申请专业：{selectedApp?.major.name}</p>
            <p className="text-sm text-gray-600">
              操作：
              <span className={reviewAction === 'approve' ? 'text-green-600' : reviewAction === 'reject' ? 'text-red-600' : 'text-orange-600'}>
                {reviewAction === 'approve' ? '通过' : reviewAction === 'request_resubmit' ? '要求补充材料' : '拒绝'}
              </span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              审核意见
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="请输入审核意见（选填）"
            />
          </div>

          {reviewAction === 'request_resubmit' && (
            <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
              系统将自动设置7天补充材料期限
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setReviewModalOpen(false); setSelectedApp(null); }}>
              取消
            </Button>
            <Button
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
              onClick={handleReview}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认'}
            </Button>
          </div>
        </div>
        </ModalBody>
      </Modal>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setSelectedApp(null); }}
      >
        <ModalHeader onClose={() => { setDetailModalOpen(false); setSelectedApp(null); }}>
          申请详情
        </ModalHeader>
        <ModalBody>
        {selectedApp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">学生姓名</p>
                <p className="font-medium">{selectedApp.student.username}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">学生邮箱</p>
                <p className="font-medium">{selectedApp.student.email || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">申请学校</p>
                <p className="font-medium">{selectedApp.major.school.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">申请专业</p>
                <p className="font-medium">{selectedApp.major.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">当前状态</p>
                <Badge variant={STATUS_CONFIG[selectedApp.status].color as any}>
                  {STATUS_CONFIG[selectedApp.status].label}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">提交时间</p>
                <p className="font-medium">{formatDate(selectedApp.applied_at)}</p>
              </div>
            </div>

            {selectedApp.reviews.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">审核历史</p>
                <div className="space-y-2">
                  {selectedApp.reviews.map((review) => (
                    <div key={review.id} className="text-sm border-l-2 border-gray-200 pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.reviewer.username}</span>
                        <Badge
                          variant={
                            review.action === 'approve' ? 'green' :
                            review.action === 'reject' ? 'red' : 'orange'
                          }
                        >
                          {review.action === 'approve' ? '通过' :
                           review.action === 'reject' ? '拒绝' : '要求补充'}
                        </Badge>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600 mt-1">意见：{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(review.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setDetailModalOpen(false); }}>
                关闭
              </Button>
              <Button
                variant="default"
                onClick={() => { setDetailModalOpen(false); openReviewModal(selectedApp, 'approve'); }}
              >
                进行审核
              </Button>
            </div>
          </div>
        )}
        </ModalBody>
      </Modal>
    </div>
  );
}
