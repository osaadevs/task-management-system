import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AllTasks from './pages/AllTasks';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import AdminUsers from './pages/AdminUsers';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="tasks" element={<AllTasks />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="admin" element={<AdminUsers />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
