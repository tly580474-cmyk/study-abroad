import apiClient from './api';
import type { ApplicationStatus } from '../types';

export interface ExportFilters {
  status?: ApplicationStatus;
  school_id?: string;
  startDate?: string;
  endDate?: string;
}

export const exportService = {
  async exportApplications(filters?: ExportFilters): Promise<void> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.school_id) params.append('school_id', filters.school_id);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/export/applications${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `applications_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  },

  async exportUsers(): Promise<void> {
    const response = await apiClient.get('/export/users', {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  },
};

export default exportService;
