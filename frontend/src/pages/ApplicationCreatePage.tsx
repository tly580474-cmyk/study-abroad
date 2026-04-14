import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { schoolService, type School, type Major } from '../services/schoolService';
import { applicationService } from '../services/applicationService';
import { useAuthStore } from '../stores';
import { ArrowLeft, GraduationCap, School as SchoolIcon, FileText, AlertCircle } from 'lucide-react';

export function ApplicationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [majorsBySchool, setMajorsBySchool] = useState<Record<string, Major[]>>({});
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool && !majorsBySchool[selectedSchool]) {
      loadMajors(selectedSchool);
    }
  }, [selectedSchool]);

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

  const loadMajors = async (schoolId: string) => {
    try {
      const data = await schoolService.getMajors(schoolId);
      setMajorsBySchool((prev) => ({ ...prev, [schoolId]: data }));
    } catch {
      setError('加载专业列表失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMajor) {
      setError('请选择专业');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const application = await applicationService.createApplication({
        major_id: selectedMajor,
      });
      navigate(`/applications/${application.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '创建申请失败');
    } finally {
      setSubmitting(false);
    }
  };

  const majors = selectedSchool ? majorsBySchool[selectedSchool] || [] : [];
  const selectedMajorData = majors.find((m) => m.id === selectedMajor);

  if (user?.role !== 'student') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">无权限访问</h2>
            <p className="text-gray-600">只有学生角色可以创建申请</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/applications')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回申请列表
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary-600" />
            创建留学申请
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <SchoolIcon className="h-4 w-4 inline mr-1" />
                选择学校
              </label>
              <select
                value={selectedSchool}
                onChange={(e) => {
                  setSelectedSchool(e.target.value);
                  setSelectedMajor('');
                }}
                disabled={loading}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">请选择学校</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} - {school.country} {school.city}
                  </option>
                ))}
              </select>
            </div>

            {selectedSchool && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  选择专业
                </label>
                <select
                  value={selectedMajor}
                  onChange={(e) => setSelectedMajor(e.target.value)}
                  disabled={loading}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">请选择专业</option>
                  {majors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.name}
                      {major.quota - major.enrolled > 0
                        ? ` (剩余名额: ${major.quota - major.enrolled})`
                        : ' (已满)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedMajorData && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-gray-900">{selectedMajorData.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">学校：</span>
                    <span className="text-gray-900">{selectedMajorData.school?.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">学费：</span>
                    <span className="text-gray-900">${selectedMajorData.tuition}/年</span>
                  </div>
                  <div>
                    <span className="text-gray-500">名额：</span>
                    <span className="text-gray-900">
                      {selectedMajorData.enrolled}/{selectedMajorData.quota}
                    </span>
                  </div>
                  {selectedMajorData.requirements && (
                    <div className="col-span-2">
                      <span className="text-gray-500">要求：</span>
                      <span className="text-gray-900">{selectedMajorData.requirements}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={!selectedMajor || submitting}>
                {submitting ? '创建中...' : '创建申请'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/applications')}
              >
                取消
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">温馨提示：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>创建申请后，需要上传申请材料才能提交</li>
                <li>请前往申请详情页上传材料</li>
                <li>材料上传完成后，点击"提交申请"按钮完成申请</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
