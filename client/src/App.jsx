import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginSelector from './pages/LoginSelector';
import StudentLogin from './pages/StudentLogin';
import AdminLogin from './pages/AdminLogin';
import StudentDashboard from './pages/student/Dashboard';
import Dashboard from './pages/admin/Dashboard';
import Departments from './pages/admin/Departments';
import Levels from './pages/admin/Levels';
import Semesters from './pages/admin/Semesters';
import Students from './pages/admin/Students';
import StudentProfile from './pages/admin/StudentProfile';
import Results from './pages/admin/Results';

function AdminRoute({ children }) {
  return <ProtectedRoute role="admin">{children}</ProtectedRoute>;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'student') return <Navigate to="/student" replace />;
  return <LoginSelector />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Student */}
          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/admin/departments" element={<AdminRoute><Departments /></AdminRoute>} />
          <Route path="/admin/levels" element={<AdminRoute><Levels /></AdminRoute>} />
          <Route path="/admin/semesters" element={<AdminRoute><Semesters /></AdminRoute>} />
          <Route path="/admin/students" element={<AdminRoute><Students /></AdminRoute>} />
          <Route path="/admin/students/:id" element={<AdminRoute><StudentProfile /></AdminRoute>} />
          <Route path="/admin/results" element={<AdminRoute><Results /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
