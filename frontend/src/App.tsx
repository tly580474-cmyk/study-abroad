import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { useAuthStore } from './stores';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/applications" element={<DashboardPage />} />
        <Route path="/review" element={<DashboardPage />} />
        <Route path="/approval" element={<DashboardPage />} />
        <Route path="/schools" element={<DashboardPage />} />
        <Route path="/analytics" element={<DashboardPage />} />
        <Route path="/users" element={<DashboardPage />} />
        <Route path="/settings" element={<DashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
