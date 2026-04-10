import { z } from 'zod';
import type { Role, ApplicationStatus, ReviewAction } from '../types/index.js';

export const RoleSchema = z.enum([
  'student',
  'reviewer',
  'approver',
  'school_admin',
  'analyst',
  'admin',
]);

export const ApplicationStatusSchema = z.enum([
  'draft',
  'submitted',
  'pending_supplement',
  'approved',
  'completed',
  'rejected',
  'expired',
]);

export const ReviewActionSchema = z.enum([
  'request_resubmit',
  'approve',
  'reject',
]);

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  role: RoleSchema,
  school_id: z.string().optional(),
  managed_schools: z.array(z.string()).optional(),
});

export const LoginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  role: RoleSchema,
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const CreateApplicationSchema = z.object({
  major_id: z.string().uuid(),
});

export const UpdateApplicationSchema = z.object({
  status: ApplicationStatusSchema.optional(),
  reviewer_id: z.string().uuid().optional(),
  deadline: z.string().datetime().optional(),
});

export const CreateReviewSchema = z.object({
  application_id: z.string().uuid(),
  action: ReviewActionSchema,
  comment: z.string().optional(),
});

export const CreateApprovalSchema = z.object({
  application_id: z.string().uuid(),
  notes: z.string().optional(),
});

export const CreateSchoolSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  logo: z.string().url().optional(),
  description: z.string().optional(),
});

export const CreateMajorSchema = z.object({
  school_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  quota: z.number().int().positive(),
  tuition: z.number().positive(),
  requirements: z.string().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type CreateApprovalInput = z.infer<typeof CreateApprovalSchema>;
export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>;
export type CreateMajorInput = z.infer<typeof CreateMajorSchema>;
