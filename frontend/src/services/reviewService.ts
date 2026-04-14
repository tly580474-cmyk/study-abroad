import apiClient from './api';

export interface SchoolReview {
  id: string;
  school_id: string;
  user_id: string;
  rating: number;
  content: string;
  created_at: string;
  updated_at: string;
  user?: { id: string; username: string };
  school?: { id: string; name: string; logo?: string };
}

export interface ReviewStats {
  total: number;
  averageRating: number;
  ratingDistribution: number[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const reviewService = {
  async getSchoolReviews(
    schoolId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<SchoolReview>> {
    const response = await apiClient.get(`/reviews/school/${schoolId}`, {
      params: { page, limit },
    });
    return response.data;
  },

  async getReviewStats(schoolId: string): Promise<ReviewStats> {
    const response = await apiClient.get(`/reviews/stats/${schoolId}`);
    return response.data.data;
  },

  async createReview(data: {
    school_id: string;
    rating: number;
    content: string;
  }): Promise<SchoolReview> {
    const response = await apiClient.post('/reviews', data);
    return response.data.data;
  },

  async updateReview(
    id: string,
    data: { rating?: number; content?: string }
  ): Promise<SchoolReview> {
    const response = await apiClient.put(`/reviews/${id}`, data);
    return response.data.data;
  },

  async deleteReview(id: string): Promise<void> {
    await apiClient.delete(`/reviews/${id}`);
  },

  async getMyReviews(): Promise<SchoolReview[]> {
    const response = await apiClient.get('/reviews/my');
    return response.data.data;
  },
};