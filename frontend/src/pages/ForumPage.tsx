import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { forumService, type ForumPost } from '../services/forumService';
import { useAuthStore } from '../stores';
import { Plus, MessageCircle, Heart, Eye, Pin, Search } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  general: '综合讨论',
  application: '申请经验',
  visa: '签证指南',
  scholarship: '奖学金',
  life: '留学生活',
  QnA: '问答',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  application: 'bg-blue-100 text-blue-700',
  visa: 'bg-green-100 text-green-700',
  scholarship: 'bg-yellow-100 text-yellow-700',
  life: 'bg-purple-100 text-purple-700',
  QnA: 'bg-red-100 text-red-700',
};

export function ForumPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const loadPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await forumService.getPosts({
        page,
        limit: 20,
        category: category || undefined,
        search: search || undefined,
      });
      setPosts(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPosts(1);
  };

  const canCreatePost = user && ['student', 'school_admin', 'admin'].includes(user.role);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">留学论坛</h1>
        {canCreatePost && (
          <Button onClick={() => navigate('/forum/new')}>
            <Plus className="w-4 h-4 mr-2" />
            发布帖子
          </Button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索帖子..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit">搜索</Button>
          </form>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCategory('')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            !category ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              category === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">暂无帖子</p>
            {canCreatePost && (
              <Button className="mt-4" onClick={() => navigate('/forum/new')}>
                发起讨论
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/forum/${post.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                          <Pin className="w-3 h-3" /> 置顶
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded ${CATEGORY_COLORS[post.category]}`}>
                        {CATEGORY_LABELS[post.category]}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">{post.content.replace(/<[^>]*>/g, '')}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                          {post.user?.username?.charAt(0).toUpperCase()}
                        </div>
                        {post.user?.username}
                      </span>
                      {post.school && (
                        <span className="text-blue-600">{post.school.name}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" /> {post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {post._count?.comments || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> {post._count?.likes || 0}
                      </span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => loadPosts(page)}
              className={`px-3 py-1 rounded ${
                pagination.page === page ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}