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

export interface RegisterWithEmailRequest {
  username: string;
  password: string;
  email: string;
  code: string;
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

  async sendCode(email: string, type: 'REGISTER' | 'RESET_PASSWORD'): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/send-code', { email, type });
    return response.data;
  },

  async verifyCode(email: string, code: string, type: 'REGISTER' | 'RESET_PASSWORD'): Promise<{ success: boolean; message: string; verificationId?: string }> {
    const response = await apiClient.post<{ success: boolean; message: string; verificationId?: string }>('/auth/verify-code', { email, code, type });
    return response.data;
  },

  async registerWithEmail(data: RegisterWithEmailRequest): Promise<LoginResponse> {
    const response = await apiClient.post<{ success: boolean; data: LoginResponse }>('/auth/register-with-email', data);
    return response.data.data;
  },

  async getProfile(): Promise<LoginResponse['user']> {
    const response = await apiClient.get<{ success: boolean; data: LoginResponse['user'] }>('/auth/profile');
    return response.data.data;
  },
};

export default authService;
