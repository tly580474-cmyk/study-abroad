import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RichTextEditor } from '../components/RichTextEditor';
import { forumService } from '../services/forumService';
import { useAuthStore } from '../stores';
import { ArrowLeft, Send } from 'lucide-react';

const CATEGORIES = [
  { value: 'general', label: '综合讨论' },
  { value: 'application', label: '申请经验' },
  { value: 'visa', label: '签证指南' },
  { value: 'scholarship', label: '奖学金' },
  { value: 'life', label: '留学生活' },
  { value: 'QnA', label: '问答' },
];

export function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [schoolId, setSchoolId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user || !['student', 'school_admin', 'admin'].includes(user.role)) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">您没有权限创建帖子</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || content === '<p></p>') {
      setError('请填写标题和内容');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await forumService.createPost({
        title,
        content,
        category,
        school_id: schoolId || undefined,
      });
      navigate('/forum');
    } catch (err: any) {
      setError(err?.response?.data?.error || '创建帖子失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/forum')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        返回论坛
      </button>

      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">发布帖子</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入帖子标题"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关联学校（可选）
              </label>
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">不关联</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="请输入帖子内容（支持富文本：加粗、斜体、标题、列表、图片、视频、YouTube等）"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/forum')}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? '发布中...' : '发布帖子'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}