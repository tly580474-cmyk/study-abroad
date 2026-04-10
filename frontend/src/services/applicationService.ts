import apiClient from './api';
import type { Application, ApplicationStatus } from '../types';

export interface CreateApplicationRequest {
  major_id: string;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const applicationService = {
  async getApplications(filters?: ApplicationFilters): Promise<PaginatedResponse<Application>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

    const response = await apiClient.get<PaginatedResponse<Application>>(
      `/applications?${params.toString()}`
    );
    return response.data;
  },

  async getApplicationById(id: string): Promise<Application> {
    const response = await apiClient.get<{ success: boolean; data: Application }>(
      `/applications/${id}`
    );
    return response.data.data;
  },

  async createApplication(data: CreateApplicationRequest): Promise<Application> {
    const response = await apiClient.post<{ success: boolean; data: Application }>(
      '/applications',
      data
    );
    return response.data.data;
  },

  async submitApplication(id: string): Promise<Application> {
    const response = await apiClient.post<{ success: boolean; data: Application }>(
      `/applications/${id}/submit`
    );
    return response.data.data;
  },

  async reviewApplication(
    id: string,
    action: 'approve' | 'reject' | 'request_resubmit',
    comment?: string
  ): Promise<Application> {
    const response = await apiClient.post<{ success: boolean; data: Application }>(
      `/applications/${id}/review`,
      { action, comment }
    );
    return response.data.data;
  },

  async approveApplication(id: string, notes?: string): Promise<Application> {
    const response = await apiClient.post<{ success: boolean; data: Application }>(
      `/applications/${id}/approve`,
      { notes }
    );
    return response.data.data;
  },
};

export default applicationService;
