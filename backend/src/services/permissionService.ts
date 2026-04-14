import type { JwtPayload } from '../types/index.js';

export type ResourceFilter =
  | { school_id?: string }
  | { student_id?: string }
  | { reviewer_id?: string }
  | { school_id?: { in: string[] } };

export function buildResourceFilter(
  user: JwtPayload,
  resource: 'application' | 'school' | 'major'
): ResourceFilter {
  switch (user.role) {
    case 'school_admin':
      if ((resource === 'application' || resource === 'major') && user.school_id) {
        return { school_id: user.school_id };
      }
      return {};

    case 'reviewer':
      if (resource === 'application') {
        return {};
      }
      return {};

    case 'approver':
      if (resource === 'application' && user.managed_schools && user.managed_schools.length > 0) {
        return { school_id: { in: user.managed_schools } };
      }
      return {};

    case 'analyst':
    case 'admin':
      return {};

    default:
      if (resource === 'application') {
        return { student_id: user.userId };
      }
      return {};
  }
}

export function canAccessResource(
  user: JwtPayload,
  resourceOwnerId: string,
  resource: 'application' | 'school' | 'major'
): boolean {
  switch (user.role) {
    case 'admin':
    case 'analyst':
      return true;

    case 'school_admin':
      if (resource === 'application' || resource === 'major') {
        return resourceOwnerId === user.school_id;
      }
      return resourceOwnerId === user.school_id;

    case 'reviewer':
      if (resource === 'application') {
        return resourceOwnerId === user.userId;
      }
      return false;

    case 'approver':
      if (resource === 'application' || resource === 'major') {
        return user.managed_schools?.includes(resourceOwnerId) || false;
      }
      return false;

    case 'student':
      return resourceOwnerId === user.userId;

    default:
      return false;
  }
}
