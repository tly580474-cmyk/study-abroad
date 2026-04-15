import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores';
import { GraduationCap } from 'lucide-react';
import { authService } from '../services/authService';
import axios from 'axios';

type RegisterStep = 'form' | 'verify';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [countdown, setCountdown] = useState(0);
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    code: '',
  });
  const [error, setError] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(loginData);
      setAuth(response.user, response.token);
      navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登录失败，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!registerData.email) {
      setError('请输入邮箱地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.sendCode(registerData.email, 'REGISTER');
      setRegisterStep('verify');
      setCountdown(60);
      startCountdown();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('验证码发送失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerData.password !== registerData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (registerData.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    if (!registerData.email) {
      setError('请输入邮箱地址');
      return;
    }

    setLoading(true);

    try {
      await authService.sendCode(registerData.email, 'REGISTER');
      setRegisterStep('verify');
      setCountdown(60);
      startCountdown();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('验证码发送失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!registerData.code || registerData.code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.registerWithEmail({
        username: registerData.username,
        password: registerData.password,
        email: registerData.email,
        code: registerData.code,
      });

      if (response.token) {
        setAuth(response.user, response.token);
        navigate('/dashboard');
      } else {
        setError('注册成功，请登录');
        setIsRegister(false);
        setRegisterStep('form');
        setLoginData({ username: registerData.username, password: '' });
        setRegisterData({ username: '', password: '', confirmPassword: '', email: '', code: '' });
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('注册失败，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setRegisterStep('form');
    setRegisterData({ ...registerData, code: '' });
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">留学管理系统</h1>
          <p className="mt-2 text-gray-600">
            {isRegister ? (registerStep === 'form' ? '创建新账户' : '验证邮箱') : '登录到您的账户'}
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {isRegister ? (
            registerStep === 'form' ? (
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700">
                    用户名
                  </label>
                  <Input
                    id="reg-username"
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    placeholder="请输入用户名（至少3位）"
                    className="mt-1"
                    required
                    minLength={3}
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">
                    密码
                  </label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="请输入密码（至少6位）"
                    className="mt-1"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-700">
                    确认密码
                  </label>
                  <Input
                    id="reg-confirm-password"
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    placeholder="请再次输入密码"
                    className="mt-1"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">
                    邮箱
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      placeholder="请输入邮箱"
                      className="mt-1 flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={loading || countdown > 0}
                      className="mt-1 whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}秒` : '获取验证码'}
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                  <p>注意：注册默认角色为学生，老师请联系管理员</p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '发送中...' : '下一步'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setError(''); setRegisterStep('form'); }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    已有账号？立即登录
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    验证码已发送至
                  </p>
                  <p className="font-semibold text-lg text-gray-900">{registerData.email}</p>
                </div>

                <div>
                  <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700">
                    验证码
                  </label>
                  <Input
                    id="verify-code"
                    type="text"
                    value={registerData.code}
                    onChange={(e) => setRegisterData({ ...registerData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="请输入6位验证码"
                    className="mt-1 text-center text-lg tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToForm}
                    className="flex-1"
                    disabled={loading}
                  >
                    上一步
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? '注册中...' : '完成注册'}
                  </Button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (countdown === 0) {
                        handleSendCode();
                      }
                    }}
                    disabled={countdown > 0}
                    className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
                  >
                    {countdown > 0 ? `重新获取验证码 (${countdown}s)` : '重新获取验证码'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  用户名
                </label>
                <Input
                  id="username"
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  placeholder="请输入用户名"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  密码
                </label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="请输入密码"
                  className="mt-1"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(''); setRegisterStep('form'); setRegisterData({ username: '', password: '', confirmPassword: '', email: '', code: '' }); }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  没有账号？立即注册
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
