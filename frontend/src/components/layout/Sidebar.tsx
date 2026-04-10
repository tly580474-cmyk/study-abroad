import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../stores';
import type { Role } from '../../types';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Building2,
  BarChart3,
  Settings,
  GraduationCap,
  Users,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const navigation: { name: string; href: string; icon: typeof LayoutDashboard; roles?: Role[] }[] = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '我的申请', href: '/applications', icon: FileText, roles: ['student'] },
  { name: '待审核', href: '/review', icon: CheckCircle, roles: ['reviewer'] },
  { name: '待批复', href: '/approval', icon: CheckCircle, roles: ['approver'] },
  { name: '学校管理', href: '/schools', icon: Building2, roles: ['school_admin', 'admin'] },
  { name: '数据分析', href: '/analytics', icon: BarChart3, roles: ['analyst', 'admin'] },
  { name: '用户管理', href: '/users', icon: Users, roles: ['admin'] },
  { name: '系统设置', href: '/settings', icon: Settings, roles: ['admin'] },
];

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();

  const filteredNav = navigation.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside className={cn('flex flex-col bg-white border-r border-gray-200', className)}>
      <div className="flex items-center gap-2 h-16 px-4 border-b border-gray-200">
        <GraduationCap className="h-8 w-8 text-primary-600" />
        <span className="font-semibold text-lg">留学管理</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-gray-900">{user?.username}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
      </div>
    </aside>
  );
}
