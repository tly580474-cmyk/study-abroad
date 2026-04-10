import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores';
import { schoolService, type School, type Major } from '../services/schoolService';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { AlertCircle, Building, Plus, Edit, Trash2, GraduationCap } from 'lucide-react';

export function SchoolsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolForm, setSchoolForm] = useState({ name: '', country: '', city: '', description: '' });
  const [majorsModalOpen, setMajorsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithMajors | null>(null);
  const [majors, setMajors] = useState<Major[]>([]);

  interface SchoolWithMajors extends School {
    majors: Major[];
  }

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const data = await schoolService.getSchools();
      setSchools(data);
    } catch {
      setError('加载学校列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchool = async () => {
    try {
      if (editingSchool) {
        await fetch(`/api/schools/${editingSchool.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schoolForm),
        });
      } else {
        await fetch('/api/schools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schoolForm),
        });
      }
      setIsModalOpen(false);
      setEditingSchool(null);
      setSchoolForm({ name: '', country: '', city: '', description: '' });
      loadSchools();
    } catch {
      setError(editingSchool ? '更新学校失败' : '创建学校失败');
    }
  };

  const handleDeleteSchool = async (id: string) => {
    if (!confirm('确定要删除这个学校吗？')) return;
    try {
      await fetch(`/api/schools/${id}`, { method: 'DELETE' });
      loadSchools();
    } catch {
      setError('删除学校失败');
    }
  };

  const openEditModal = (school: School) => {
    setEditingSchool(school);
    setSchoolForm({
      name: school.name,
      country: school.country,
      city: school.city,
      description: school.description || '',
    });
    setIsModalOpen(true);
  };

  const openMajorsModal = async (school: School) => {
    try {
      const data = await schoolService.getSchoolWithMajors(school.id);
      setSelectedSchool(data);
      setMajors(data.majors || []);
      setMajorsModalOpen(true);
    } catch {
      setError('加载专业列表失败');
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'school_admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">无权限访问</h2>
            <p className="text-gray-600">只有管理员或学校管理员可以访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学校管理</h1>
          <p className="text-gray-500 mt-1">管理系统中的学校信息</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => { setEditingSchool(null); setSchoolForm({ name: '', country: '', city: '', description: '' }); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            添加学校
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : schools.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无学校数据
          </div>
        ) : (
          schools.map((school) => (
            <Card key={school.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary-50 rounded-lg">
                      <Building className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{school.name}</h3>
                      <p className="text-sm text-gray-500">{school.country} {school.city}</p>
                    </div>
                  </div>
                </div>
                {school.description && (
                  <p className="mt-4 text-sm text-gray-600 line-clamp-2">{school.description}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openMajorsModal(school)}>
                    <GraduationCap className="h-4 w-4 mr-1" />
                    专业
                  </Button>
                  {user?.role === 'admin' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEditModal(school)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteSchool(school.id)} className="text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>{editingSchool ? '编辑学校' : '添加学校'}</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">学校名称</label>
              <Input
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                placeholder="请输入学校名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
                <Input
                  value={schoolForm.country}
                  onChange={(e) => setSchoolForm({ ...schoolForm, country: e.target.value })}
                  placeholder="请输入国家"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
                <Input
                  value={schoolForm.city}
                  onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                  placeholder="请输入城市"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={schoolForm.description}
                onChange={(e) => setSchoolForm({ ...schoolForm, description: e.target.value })}
                placeholder="请输入学校描述"
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>取消</Button>
          <Button onClick={handleSaveSchool}>保存</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={majorsModalOpen} onClose={() => setMajorsModalOpen(false)}>
        <ModalHeader>{selectedSchool?.name} - 专业管理</ModalHeader>
        <ModalBody>
          {majors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无专业数据</div>
          ) : (
            <div className="space-y-3">
              {majors.map((major) => (
                <div key={major.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{major.name}</p>
                    <p className="text-sm text-gray-500">
                      学费: ${Number(major.tuition)}/年 | 名额: {major.enrolled}/{major.quota}
                    </p>
                    {major.requirements && (
                      <p className="text-sm text-gray-500 mt-1">要求: {major.requirements}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${major.enrolled >= major.quota ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {major.enrolled >= major.quota ? '已满' : '有名额'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setMajorsModalOpen(false)}>关闭</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
