import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../stores';
import { Menu } from 'lucide-react';

export function MainLayout() {
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar className={`hidden lg:flex ${sidebarOpen ? 'w-64' : 'w-0'}`} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
