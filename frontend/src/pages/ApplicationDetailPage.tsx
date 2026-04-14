import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { applicationService } from '../services/applicationService';
import { documentService } from '../services/documentService';
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
  Upload,
  Trash2,
  Download,
  Paperclip,
  Eye,
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
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<{ name: string; mimeType: string; dataUrl: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      if (data.documents) {
        setDocuments(data.documents);
      }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !application) return;

    setUploading(true);
    try {
      const doc = await documentService.uploadDocument(application.id, file);
      setDocuments([...documents, doc]);
    } catch (err: any) {
      alert(err?.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const confirmed = window.confirm('确定要删除这个文档吗？');
    if (!confirmed) return;
    try {
      await documentService.deleteDocument(docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err: any) {
      alert(err?.response?.data?.error || '删除失败');
    }
  };

  const handlePreview = async (docId: string) => {
    setPreviewLoading(true);
    try {
      const data = await documentService.previewDocument(docId);
      setPreviewData(data);
    } catch (err: any) {
      alert(err?.response?.data?.error || '预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
  const canSubmit = user?.role === 'student' && (application.status === 'draft' || application.status === 'pending_supplement') && user?.id === application.student_id;
  const canWithdraw = user?.role === 'student' && application.status === 'submitted' && user?.id === application.student_id;
  const canDelete = user?.role === 'admin' || (user?.role === 'student' && application.status === 'draft' && user?.id === application.student_id);

  const handleSubmitApplication = async () => {
    if (!application) return;
    if (documents.length === 0) {
      alert('请先上传申请材料后再提交');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      await applicationService.submitApplication(application.id);
      await loadApplication();
    } catch (err: any) {
      setError(err?.response?.data?.error || '提交申请失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!application) return;
    const confirmed = window.confirm('确定要撤回申请吗？撤回后可以重新提交。');
    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    try {
      await applicationService.withdrawApplication(application.id);
      await loadApplication();
    } catch (err: any) {
      setError(err?.response?.data?.error || '撤回申请失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!application) return;
    const confirmed = window.confirm('确定要删除此申请吗？删除后无法恢复。');
    if (!confirmed) return;

    setActionLoading(true);
    setError('');
    try {
      await applicationService.deleteApplication(application.id);
      navigate('/applications');
    } catch (err: any) {
      setError(err?.response?.data?.error || '删除申请失败');
      setActionLoading(false);
    }
  };

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

              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500 mb-2">申请材料</div>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">暂无材料</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm truncate">{doc.name}</span>
                          <span className="text-xs text-gray-400">{formatFileSize(doc.size)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePreview(doc.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="预览"
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                          <a
                            href={documentService.downloadDocument(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Download className="h-4 w-4 text-gray-500" />
                          </a>
                          {(user?.role === 'admin' || user?.id === application.student_id) && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(user?.role === 'admin' || user?.id === application.student_id) && (
                  <div className="mt-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {uploading ? '上传中...' : '上传材料'}
                    </Button>
                  </div>
                )}
                {canSubmit && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={handleSubmitApplication}
                      disabled={actionLoading || documents.length === 0}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {actionLoading ? '提交中...' : (application.status === 'pending_supplement' ? '重新提交' : '提交申请')}
                    </Button>
                    {documents.length === 0 && (
                      <p className="text-sm text-orange-600 mt-2 text-center">
                        请先上传申请材料后再提交
                      </p>
                    )}
                  </div>
                )}
                {canWithdraw && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleWithdrawApplication}
                      disabled={actionLoading}
                      className="w-full"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {actionLoading ? '撤回中...' : '撤回申请'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      撤回后可重新编辑材料后再提交
                    </p>
                  </div>
                )}
                {canDelete && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleDeleteApplication}
                      disabled={actionLoading}
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {actionLoading ? '删除中...' : '删除申请'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      删除后无法恢复
                    </p>
                  </div>
                )}
              </div>
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

        {previewData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-medium truncate">{previewData.name}</h3>
                <button
                  onClick={() => setPreviewData(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-gray-100">
                {previewLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">加载中...</div>
                  </div>
                ) : previewData.mimeType.startsWith('image/') ? (
                  <img
                    src={previewData.dataUrl}
                    alt={previewData.name}
                    className="max-w-full mx-auto"
                  />
                ) : previewData.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewData.dataUrl}
                    className="w-full h-[70vh]"
                    title={previewData.name}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText className="h-12 w-12 mb-4" />
                    <p>该文件类型暂不支持预览</p>
                    <a
                      href={`data:${previewData.mimeType};base64,${previewData.dataUrl.split(',')[1]}`}
                      download={previewData.name}
                      className="mt-4 text-primary-600 hover:underline"
                    >
                      下载文件
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
