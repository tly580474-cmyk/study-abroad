import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { forumService, type ForumPost, type PostComment } from '../services/forumService';
import { useAuthStore } from '../stores';
import { ArrowLeft, Heart, MessageCircle, Share2, Edit, Trash2, Send, Pin, Star } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  general: '综合讨论',
  application: '申请经验',
  visa: '签证指南',
  scholarship: '奖学金',
  life: '留学生活',
  QnA: '问答',
};

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      const data = await forumService.getPostById(id!);
      setPost(data);
    } catch (error) {
      console.error('Failed to load post:', error);
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadComments = useCallback(async () => {
    try {
      const data = await forumService.getComments(id!);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadPost();
      loadComments();
    }
  }, [id, loadPost, loadComments]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const result = await forumService.toggleLike(id!);
      setLiked(result.liked);
      if (post) {
        setPost({
          ...post,
          _count: {
            comments: post._count?.comments || 0,
            likes: (post._count?.likes || 0) + (result.liked ? 1 : -1),
          },
        });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !user) return;

    setSubmitting(true);
    try {
      await forumService.addComment(id!, { content: commentContent });
      setCommentContent('');
      loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('确定要删除这个帖子吗？')) return;
    try {
      await forumService.deletePost(id!);
      navigate('/forum');
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const handleTogglePin = async () => {
    try {
      const result = await forumService.togglePin(id!);
      if (post) {
        setPost({ ...post, is_pinned: result.is_pinned });
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleToggleFeatured = async () => {
    try {
      const result = await forumService.toggleFeatured(id!);
      if (post) {
        setPost({ ...post, is_premium: result.is_premium });
      }
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    }
  };

  const canPin = user && ['school_admin', 'admin'].includes(user.role);
  const canFeature = user && user.role === 'admin';

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">帖子不存在</div>
      </div>
    );
  }

  const canEdit = user && (user.id === post.user_id || user.role === 'admin');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/forum')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        返回论坛
      </button>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
              {CATEGORY_LABELS[post.category]}
            </span>
            {post.is_pinned && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded flex items-center gap-1">
                <Pin className="w-3 h-3" /> 置顶
              </span>
            )}
            {post.is_premium && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-sm rounded flex items-center gap-1">
                <Star className="w-3 h-3" /> 精华
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>

          <div className="flex items-center gap-4 mb-6 pb-4 border-b">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {post.user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900">{post.user?.username}</p>
              <p className="text-sm text-gray-500">{new Date(post.created_at).toLocaleString()}</p>
            </div>
            {post.school && (
              <span className="ml-auto text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">
                {post.school.name}
              </span>
            )}
          </div>

          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>

          <div className="flex items-center gap-4 mt-6 pt-4 border-t">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors cursor-pointer ${
                liked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              {post._count?.likes || 0}
            </button>
            <span className="flex items-center gap-2 text-gray-600">
              <MessageCircle className="w-4 h-4" />
              {post._count?.comments || 0}
            </span>
            <span className="flex items-center gap-2 text-gray-600">
              <Share2 className="w-4 h-4" />
              分享
            </span>
            {canEdit && (
              <div className="ml-auto flex gap-2">
                {canPin && (
                  <Button variant="outline" size="sm" onClick={handleTogglePin}>
                    <Pin className={`w-4 h-4 mr-1 ${post.is_pinned ? 'fill-current text-red-500' : ''}`} />
                    {post.is_pinned ? '取消置顶' : '置顶'}
                  </Button>
                )}
                {canFeature && (
                  <Button variant="outline" size="sm" onClick={handleToggleFeatured}>
                    <Star className={`w-4 h-4 mr-1 ${post.is_premium ? 'fill-current text-amber-500' : ''}`} />
                    {post.is_premium ? '取消精华' : '精华'}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => navigate(`/forum/${id}/edit`)}>
                  <Edit className="w-4 h-4 mr-1" />
                  编辑
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeletePost}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  删除
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">评论 ({comments.length})</h3>

          {user && (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="写下你的评论..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <Button type="submit" disabled={submitting || !commentContent.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  发布评论
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                    {comment.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{comment.user?.username}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-700">{comment.content}</p>
                  </div>
                </div>

                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-11 mt-3 space-y-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">
                          {reply.user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{reply.user?.username}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(reply.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700 text-sm">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}