import apiClient from './api';
import type { Role } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    role: Role;
    email?: string;
    phone?: string;
    school_id?: string;
    managed_schools?: string[];
    created_at: string;
    updated_at: string;
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<{ success: boolean; data: LoginResponse }>('/auth/login', data);
    return response.data.data;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await apiClient.post<{ success: boolean; data: LoginResponse }>('/auth/register', data);
    return response.data.data;
  },

  async getProfile(): Promise<LoginResponse['user']> {
    const response = await apiClient.get<{ success: boolean; data: LoginResponse['user'] }>('/auth/profile');
    return response.data.data;
  },
};

export default authService;
