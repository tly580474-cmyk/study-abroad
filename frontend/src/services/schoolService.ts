import apiClient from './api';

export interface School {
  id: string;
  name: string;
  country: string;
  city: string;
  logo?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Major {
  id: string;
  school_id: string;
  name: string;
  quota: number;
  enrolled: number;
  tuition: string;
  requirements?: string;
  created_at: string;
  updated_at: string;
  school?: School;
}

export interface SchoolWithMajors extends School {
  majors: Major[];
}

export const schoolService = {
  async getSchools(): Promise<School[]> {
    const response = await apiClient.get<{ success: boolean; data: School[] }>('/schools');
    return response.data.data;
  },

  async getMajors(schoolId?: string): Promise<Major[]> {
    const params = schoolId ? `?school_id=${schoolId}` : '';
    const response = await apiClient.get<{ success: boolean; data: Major[] }>(`/majors${params}`);
    return response.data.data;
  },

  async getSchoolWithMajors(schoolId: string): Promise<SchoolWithMajors> {
    const response = await apiClient.get<{ success: boolean; data: SchoolWithMajors }>(`/schools/${schoolId}/with-majors`);
    return response.data.data;
  },
};

export default schoolService;
