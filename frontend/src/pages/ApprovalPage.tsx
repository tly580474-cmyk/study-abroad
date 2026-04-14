import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ModalHeader, ModalBody } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores';
import apiClient from '../services/api';
import type { ApplicationStatus } from '../types';
import { CheckCircle, Clock } from 'lucide-react';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'gray' },
  submitted: { label: '待审核', color: 'yellow' },
  pending_supplement: { label: '待补充', color: 'orange' },
  approved: { label: '待批复', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '已拒绝', color: 'red' },
  expired: { label: '已过期', color: 'red' },
};

interface Application {
  id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  deadline: string | null;
  created_at: string;
  student: { id: string; username: string; email?: string };
  major: {
    id: string;
    name: string;
    quota: number;
    enrolled: number;
    school: { id: string; name: string };
  };
  reviews: Array<{
    id: string;
    action: string;
    comment?: string;
    created_at: string;
    reviewer: { id: string; username: string };
  }>;
  approvals: Array<{
    id: string;
    notes?: string;
    created_at: string;
    approver: { id: string; username: string };
  }>;
}

export function ApprovalPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/applications', {
        params: { status: 'approved', pageSize: 100 },
      });
      const data = response?.data?.data ?? response?.data ?? [];
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载申请列表失败', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'approver' && user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadApplications();
  }, [user, navigate]);

  const handleApprove = async () => {
    if (!selectedApp) return;

    setSubmitting(true);
    try {
      await apiClient.post(`/applications/${selectedApp.id}/approve`, {
        notes: approvalNotes || undefined,
      });
      setApproveModalOpen(false);
      setSelectedApp(null);
      setApprovalNotes('');
      loadApplications();
    } catch (err: any) {
      alert(err?.response?.data?.error || '批复操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveModal = (app: Application) => {
    setSelectedApp(app);
    setApproveModalOpen(true);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const getQuotaDisplay = (enrolled: number, quota: number) => {
    const remaining = quota - enrolled;
    return `${enrolled}/${quota} (剩余 ${remaining})`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">批复工作台</h1>
        <p className="text-gray-500 mt-1">为通过审核的申请进行占位批复</p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span className="font-medium">待批复申请</span>
            <Badge variant="blue">{applications.length}</Badge>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
            <p>暂无待批复申请</p>
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
                    <div className="text-sm text-gray-600 mb-1">
                      申请专业：{app.major.name}
                    </div>
                    <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                      <span>名额占用：{getQuotaDisplay(app.major.enrolled, app.major.quota)}</span>
                      {app.major.quota - app.major.enrolled <= 3 && (
                        <Badge variant="orange">即将满额</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      审核通过时间：{formatDate(app.reviewed_at)}
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
                      {app.major.quota - app.major.enrolled > 0 ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => navigate(`/applications/${app.id}`)}
                        >
                          确认占位
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled
                        >
                          名额已满
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={approveModalOpen}
        onClose={() => { setApproveModalOpen(false); setSelectedApp(null); setApprovalNotes(''); }}
      >
        <ModalHeader onClose={() => { setApproveModalOpen(false); setSelectedApp(null); setApprovalNotes(''); }}>
          确认占位
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">申请人：{selectedApp?.student.username}</p>
              <p className="text-sm text-gray-600 mb-2">申请学校：{selectedApp?.major.school.name}</p>
              <p className="text-sm text-gray-600 mb-2">申请专业：{selectedApp?.major.name}</p>
              <p className="text-sm text-gray-600">
                名额状态：{selectedApp && getQuotaDisplay(selectedApp.major.enrolled, selectedApp.major.quota)}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                确认占位后，该学生的申请将标记为"已完成"，相应专业的已占用名额将 +1。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                批复备注
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="请输入批复备注（选填）"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setApproveModalOpen(false); setSelectedApp(null); }}>
                取消
              </Button>
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认占位'}
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
                  <p className="text-xs text-gray-500">名额状态</p>
                  <p className="font-medium">{getQuotaDisplay(selectedApp.major.enrolled, selectedApp.major.quota)}</p>
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
                          <Badge variant="green">审核通过</Badge>
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

              {selectedApp.approvals.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">批复历史</p>
                  <div className="space-y-2">
                    {selectedApp.approvals.map((approval) => (
                      <div key={approval.id} className="text-sm border-l-2 border-primary-200 pl-3 py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{approval.approver.username}</span>
                          <Badge variant="blue">已批复</Badge>
                        </div>
                        {approval.notes && (
                          <p className="text-gray-600 mt-1">备注：{approval.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(approval.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setDetailModalOpen(false); }}>
                  关闭
                </Button>
                {selectedApp.major.quota - selectedApp.major.enrolled > 0 && (
                  <Button
                    variant="default"
                    onClick={() => { setDetailModalOpen(false); openApproveModal(selectedApp); }}
                  >
                    确认占位
                  </Button>
                )}
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
