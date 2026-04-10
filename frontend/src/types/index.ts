export type Role = 'student' | 'reviewer' | 'approver' | 'school_admin' | 'analyst' | 'admin';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'pending_supplement'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'expired';

export type ReviewAction = 'request_resubmit' | 'approve' | 'reject';

export type DocumentStatus = 'uploading' | 'uploaded' | 'invalid_format' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  role: Role;
  email?: string;
  phone?: string;
  school_id?: string;
  managed_schools?: string[];
  created_at: string;
  updated_at: string;
}

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
  tuition: number;
  requirements?: string;
  created_at: string;
  updated_at: string;
  school?: School;
}

export interface Application {
  id: string;
  student_id: string;
  major_id: string;
  status: ApplicationStatus;
  reviewer_id?: string;
  applied_at?: string;
  reviewed_at?: string;
  approved_at?: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
  student?: User;
  major?: Major;
  reviews?: Review[];
  approvals?: Approval[];
  documents?: Document[];
}

export interface Review {
  id: string;
  application_id: string;
  reviewer_id: string;
  action: ReviewAction;
  comment?: string;
  created_at: string;
  reviewer?: User;
}

export interface Approval {
  id: string;
  application_id: string;
  approver_id: string;
  notes?: string;
  created_at: string;
  approver?: User;
}

export interface Document {
  id: string;
  application_id: string;
  name: string;
  url: string;
  size: number;
  mime_type: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}
