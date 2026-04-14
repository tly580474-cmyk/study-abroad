import apiClient from './api';

export interface SchoolPost {
  id: string;
  school_id: string;
  user_id: string;
  type: 'announcement' | 'news' | 'admission';
  title: string;
  content: string;
  status: 'draft' | 'published' | 'pending_review' | 'deleted';
  created_at: string;
  updated_at: string;
  user?: { id: string; username: string };
  school?: { id: string; name: string };
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

export const schoolPostService = {
  async getSchoolPosts(
    schoolId: string,
    params?: { type?: string; page?: number; limit?: number }
  ): Promise<PaginatedResponse<SchoolPost>> {
    const response = await apiClient.get(`/school-posts/school/${schoolId}`, { params });
    return response.data;
  },

  async getSchoolPostById(id: string): Promise<SchoolPost> {
    const response = await apiClient.get(`/school-posts/${id}`);
    return response.data.data;
  },

  async createSchoolPost(data: {
    school_id: string;
    type: string;
    title: string;
    content: string;
  }): Promise<SchoolPost> {
    const response = await apiClient.post('/school-posts', data);
    return response.data.data;
  },

  async updateSchoolPost(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      type: string;
      status: string;
    }>
  ): Promise<SchoolPost> {
    const response = await apiClient.put(`/school-posts/${id}`, data);
    return response.data.data;
  },

  async deleteSchoolPost(id: string): Promise<void> {
    await apiClient.delete(`/school-posts/${id}`);
  },

  async getMySchoolPosts(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<SchoolPost>> {
    const response = await apiClient.get('/school-posts/my', { params });
    return response.data;
  },
};