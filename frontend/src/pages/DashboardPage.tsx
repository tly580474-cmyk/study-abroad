import { useAuthStore } from '../stores';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const mockStats = [
  { label: '总申请数', value: '128', icon: FileText, color: 'text-blue-600' },
  { label: '待审核', value: '23', icon: Clock, color: 'text-yellow-600' },
  { label: '已通过', value: '89', icon: CheckCircle, color: 'text-green-600' },
  { label: '已拒绝', value: '16', icon: AlertCircle, color: 'text-red-600' },
];

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">欢迎回来，{user?.username}</h1>
        <p className="text-gray-500 mt-1">以下是您的留学申请概览</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gray-50 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近申请</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">申请 #{i}</p>
                  <p className="text-sm text-gray-500">计算机科学 - MIT</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                  待审核
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors cursor-pointer">
              <FileText className="h-5 w-5 text-primary-600 mb-2" />
              <p className="font-medium text-gray-900">新建申请</p>
              <p className="text-sm text-gray-500">提交新的留学申请</p>
            </button>
            <button className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors cursor-pointer">
              <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
              <p className="font-medium text-gray-900">审核申请</p>
              <p className="text-sm text-gray-500">查看待审核列表</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
