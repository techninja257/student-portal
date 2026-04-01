import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginSelector from './pages/LoginSelector';
import StudentLogin from './pages/StudentLogin';
import AdminLogin from './pages/AdminLogin';
import StudentDashboard from './pages/student/Dashboard';
import ChangePassword from './pages/student/ChangePassword';
import Dashboard from './pages/admin/Dashboard';
import Departments from './pages/admin/Departments';
import Levels from './pages/admin/Levels';
import Semesters from './pages/admin/Semesters';
import Students from './pages/admin/Students';
import StudentProfile from './pages/admin/StudentProfile';
import Results from './pages/admin/Results';
import Settings from './pages/admin/Settings';

function AdminRoute({ children }) {
  return <ProtectedRoute role="admin">{children}</ProtectedRoute>;
}

// Student route: redirects to /change-password if must_change_password is true
function StudentRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'student') return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'student') {
    if (user.must_change_password) return <Navigate to="/change-password" replace />;
    return <Navigate to="/student" replace />;
  }
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

          {/* Student — requires auth + must_change_password guard */}
          <Route path="/student" element={<StudentRoute><StudentDashboard /></StudentRoute>} />

          {/* Change password — requires student auth, accessible even with must_change_password */}
          <Route
            path="/change-password"
            element={
              <ProtectedRoute role="student">
                <ChangePassword />
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
          <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
