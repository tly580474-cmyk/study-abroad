import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { AlertCircle, Users, Plus, Edit, Trash2, Shield } from 'lucide-react';
import type { Role } from '../types';
import apiClient from '../services/api';

interface User {
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

const ROLE_LABELS: Record<Role, string> = {
  student: '学生',
  reviewer: '审查员',
  approver: '批复员',
  school_admin: '学校管理员',
  analyst: '数据分析师',
  admin: '系统管理员',
};

export function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'student' as Role,
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ success: boolean; data: User[] }>('/users');
      setUsers(response.data.data);
    } catch {
      setError('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    try {
      if (!userForm.username || (!userForm.password && !editingUser) || !userForm.role) {
        setError('请填写必填字段');
        return;
      }

      if (editingUser) {
        await apiClient.put(`/users/${editingUser.id}`, {
          username: userForm.username,
          role: userForm.role,
          email: userForm.email || undefined,
          phone: userForm.phone || undefined,
        });
      } else {
        await apiClient.post('/users', {
          username: userForm.username,
          password: userForm.password,
          role: userForm.role,
          email: userForm.email || undefined,
          phone: userForm.phone || undefined,
        });
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setUserForm({ username: '', password: '', role: 'student', email: '', phone: '' });
      loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.error || (editingUser ? '更新用户失败' : '创建用户失败'));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    try {
      await apiClient.delete(`/users/${id}`);
      loadUsers();
    } catch {
      setError('删除用户失败');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: '',
      role: user.role,
      email: user.email || '',
      phone: user.phone || '',
    });
    setIsModalOpen(true);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">无权限访问</h2>
            <p className="text-gray-600">只有系统管理员可以访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户账号</p>
        </div>
        <Button onClick={() => {
          setEditingUser(null);
          setUserForm({ username: '', password: '', role: 'student', email: '', phone: '' });
          setIsModalOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          添加用户
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-500">加载中...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-500">暂无用户数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <span className="font-medium text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'school_admin' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'analyst' ? 'bg-green-100 text-green-700' :
                          user.role === 'reviewer' ? 'bg-yellow-100 text-yellow-700' :
                          user.role === 'approver' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          <Shield className="h-3 w-3" />
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>{editingUser ? '编辑用户' : '添加用户'}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名 *</label>
              <Input
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </div>
            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密码 *</label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="请输入密码"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色 *</label>
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}
              >
                <option value="student">学生</option>
                <option value="reviewer">审查员</option>
                <option value="approver">批复员</option>
                <option value="school_admin">学校管理员</option>
                <option value="analyst">数据分析师</option>
                <option value="admin">系统管理员</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机</label>
              <Input
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                placeholder="请输入手机号"
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>取消</Button>
          <Button onClick={handleSaveUser}>保存</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
