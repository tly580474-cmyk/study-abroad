import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { schoolPostService, type SchoolPost } from '../services/schoolPostService';
import { useAuthStore } from '../stores';
import { Plus, Edit, Trash2, Megaphone, Newspaper, GraduationCap } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  announcement: '官方公告',
  news: '新闻动态',
  admission: '招生信息',
};

const TYPE_ICONS: Record<string, typeof Megaphone> = {
  announcement: Megaphone,
  news: Newspaper,
  admission: GraduationCap,
};

interface SchoolPostsProps {
  schoolId: string;
}

export function SchoolPosts({ schoolId }: SchoolPostsProps) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<SchoolPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SchoolPost | null>(null);
  const [formData, setFormData] = useState({ type: 'announcement', title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SchoolPost | null>(null);

  const canManage = user && ['school_admin', 'admin'].includes(user.role);

  useEffect(() => {
    loadPosts();
  }, [schoolId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await schoolPostService.getSchoolPosts(schoolId);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    setSubmitting(true);
    try {
      if (editingPost) {
        await schoolPostService.updateSchoolPost(editingPost.id, formData);
      } else {
        await schoolPostService.createSchoolPost({ ...formData, school_id: schoolId });
      }
      setShowModal(false);
      setEditingPost(null);
      setFormData({ type: 'announcement', title: '', content: '' });
      loadPosts();
    } catch (error) {
      console.error('Failed to submit post:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (post: SchoolPost) => {
    setEditingPost(post);
    setFormData({ type: post.type, title: post.title, content: post.content });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await schoolPostService.deleteSchoolPost(id);
      loadPosts();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const openCreateModal = () => {
    setEditingPost(null);
    setFormData({ type: 'announcement', title: '', content: '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">学校动态</h2>
        {canManage && <Button onClick={openCreateModal}>发布动态</Button>}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">加载中...</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">暂无动态</p>
            {canManage && (
              <Button className="mt-4" onClick={openCreateModal}>
                发布第一条动态
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const Icon = TYPE_ICONS[post.type] || Newspaper;
            return (
              <Card
                key={post.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      post.type === 'announcement' ? 'bg-red-100 text-red-600' :
                      post.type === 'news' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          post.type === 'announcement' ? 'bg-red-100 text-red-700' :
                          post.type === 'news' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {TYPE_LABELS[post.type]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{post.title}</h3>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {post.content.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                          className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
                          className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
        <ModalHeader>{editingPost ? '编辑动态' : '发布动态'}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="announcement">官方公告</option>
                <option value="news">新闻动态</option>
                <option value="admission">招生信息</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入标题"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入内容（支持富文本）"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowModal(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !formData.title.trim() || !formData.content.trim()}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!selectedPost} onClose={() => setSelectedPost(null)} size="lg">
        {selectedPost && (
          <>
            <ModalHeader>{selectedPost.title}</ModalHeader>
            <ModalBody>
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
              </div>
            </ModalBody>
          </>
        )}
      </Modal>
    </div>
  );
}