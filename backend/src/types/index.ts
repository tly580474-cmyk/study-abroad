import { Role, ApplicationStatus, ReviewAction, DocumentStatus } from '@prisma/client';

export type { Role, ApplicationStatus, ReviewAction, DocumentStatus };

export interface JwtPayload {
  userId: string;
  role: Role;
  school_id?: string;
  managed_schools?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
