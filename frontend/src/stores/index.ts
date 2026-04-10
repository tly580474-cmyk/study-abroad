import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: Role[]) => boolean;
}

const rolePermissions: Record<Role, string[]> = {
  student: ['application:create', 'application:read', 'document:upload'],
  reviewer: ['application:read', 'application:review', 'document:read'],
  approver: ['application:read', 'application:approve', 'school:read'],
  school_admin: ['school:read', 'school:write', 'major:read', 'major:write', 'application:read'],
  analyst: ['application:read', 'school:read', 'major:read', 'analytics:read'],
  admin: ['*'],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        const permissions = rolePermissions[user.role];
        if (permissions.includes('*')) return true;
        return permissions.includes(permission);
      },

      hasRole: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
