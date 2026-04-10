import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  LogOut,
  User,
  ChevronDown,
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

const ROLE_LABELS: Record<Role, string> = {
  student: '学生',
  reviewer: '审查员',
  approver: '批复员',
  school_admin: '学校管理员',
  analyst: '数据分析师',
  admin: '系统管理员',
};

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNav = navigation.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchAccount = () => {
    logout();
    navigate('/login');
  };

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

      <div className="px-3 py-4 border-t border-gray-200" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="h-4 w-4 text-primary-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.role ? ROLE_LABELS[user.role] : ''}</p>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', dropdownOpen && 'rotate-180')} />
        </button>

        {dropdownOpen && (
          <div className="absolute bottom-16 left-3 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={() => { navigate('/settings'); setDropdownOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="h-4 w-4" />
              账号详情
            </button>
            <button
              onClick={() => { handleSwitchAccount(); setDropdownOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Users className="h-4 w-4" />
              切换账号
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => { handleLogout(); setDropdownOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
