import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationListPage } from './pages/ApplicationListPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { ApplicationCreatePage } from './pages/ApplicationCreatePage';
import { SchoolsPage } from './pages/SchoolsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReviewPage } from './pages/ReviewPage';
import { ApprovalPage } from './pages/ApprovalPage';
import { ForumPage } from './pages/ForumPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { CreatePostPage } from './pages/CreatePostPage';
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
        <Route path="/applications" element={<ApplicationListPage />} />
        <Route path="/applications/new" element={<ApplicationCreatePage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/approval" element={<ApprovalPage />} />
        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/forum/new" element={<CreatePostPage />} />
        <Route path="/forum/:id" element={<PostDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
