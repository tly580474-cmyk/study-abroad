import apiClient from './api';

export interface ForumPost {
  id: string;
  user_id: string;
  school_id?: string;
  category: 'general' | 'application' | 'visa' | 'scholarship' | 'life' | 'QnA';
  title: string;
  content: string;
  views: number;
  is_pinned: boolean;
  is_premium: boolean;
  status: 'draft' | 'published' | 'pending_review' | 'deleted';
  created_at: string;
  updated_at: string;
  user?: { id: string; username: string };
  school?: { id: string; name: string };
  _count?: { comments: number; likes: number };
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: { id: string; username: string };
  replies?: PostComment[];
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

export const forumService = {
  async getPosts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    school_id?: string;
    search?: string;
  }): Promise<PaginatedResponse<ForumPost>> {
    const response = await apiClient.get('/forum', { params });
    return response.data;
  },

  async getPostById(id: string): Promise<ForumPost> {
    const response = await apiClient.get(`/forum/${id}`);
    return response.data.data;
  },

  async createPost(data: {
    school_id?: string;
    category: string;
    title: string;
    content: string;
  }): Promise<ForumPost> {
    const response = await apiClient.post('/forum', data);
    return response.data.data;
  },

  async updatePost(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      category: string;
      school_id: string;
      is_pinned: boolean;
      is_premium: boolean;
      status: string;
    }>
  ): Promise<ForumPost> {
    const response = await apiClient.put(`/forum/${id}`, data);
    return response.data.data;
  },

  async deletePost(id: string): Promise<void> {
    await apiClient.delete(`/forum/${id}`);
  },

  async toggleLike(id: string): Promise<{ liked: boolean }> {
    const response = await apiClient.post(`/forum/${id}/like`);
    return response.data.data;
  },

  async getComments(postId: string): Promise<PostComment[]> {
    const response = await apiClient.get(`/forum/${postId}/comments`);
    return response.data.data;
  },

  async addComment(
    postId: string,
    data: { content: string; parent_id?: string }
  ): Promise<PostComment> {
    const response = await apiClient.post(`/forum/${postId}/comments`, data);
    return response.data.data;
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/forum/comments/${commentId}`);
  },

  async getMyPosts(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<ForumPost>> {
    const response = await apiClient.get('/forum/my', { params });
    return response.data;
  },
};