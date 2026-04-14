import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { reviewService, type SchoolReview, type ReviewStats } from '../services/reviewService';
import { useAuthStore } from '../stores';
import { Star, Trash2, Edit } from 'lucide-react';

interface SchoolReviewsProps {
  schoolId: string;
}

export function SchoolReviews({ schoolId }: SchoolReviewsProps) {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<SchoolReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<SchoolReview | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        reviewService.getSchoolReviews(schoolId),
        reviewService.getReviewStats(schoolId),
      ]);
      setReviews(reviewsData.data);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      if (editingReview) {
        await reviewService.updateReview(editingReview.id, { rating, content });
      } else {
        await reviewService.createReview({ school_id: schoolId, rating, content });
      }
      setShowReviewModal(false);
      setContent('');
      setRating(5);
      setEditingReview(null);
      loadData();
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReview = (review: SchoolReview) => {
    setEditingReview(review);
    setRating(review.rating);
    setContent(review.content);
    setShowReviewModal(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('确定要删除这条评价吗？')) return;
    try {
      await reviewService.deleteReview(reviewId);
      loadData();
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${interactive ? 'cursor-pointer' : ''} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => interactive && onRate?.(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">学校评价</h3>
        {user?.role === 'student' && (
          <Button onClick={() => setShowReviewModal(true)}>写评价</Button>
        )}
      </div>

      {stats && (
        <Card>
          <CardContent className="flex items-center gap-8 py-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500">{stats.averageRating}</div>
              <div className="text-sm text-gray-500">{renderStars(Math.round(stats.averageRating))}</div>
              <div className="text-sm text-gray-500 mt-1">{stats.total} 条评价</div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-4">{star}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: stats.total > 0 ? `${(stats.ratingDistribution[star - 1] / stats.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{stats.ratingDistribution[star - 1]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              暂无评价，成为第一个评价者吧！
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.content}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      评价者：{review.user?.username || '匿名用户'}
                    </p>
                  </div>
                  {user?.id === review.user_id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditReview(review)}
                        className="p-1 text-gray-500 hover:text-blue-500"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="p-1 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)}>
        <ModalHeader>
          <h3 className="text-lg font-semibold">
            {editingReview ? '编辑评价' : '写评价'}
          </h3>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">评分</label>
              {renderStars(rating, true, setRating)}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">评价内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="分享你的留学申请经验..."
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowReviewModal(false)}>
            取消
          </Button>
          <Button onClick={handleSubmitReview} disabled={submitting}>
            {submitting ? '提交中...' : '提交'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}