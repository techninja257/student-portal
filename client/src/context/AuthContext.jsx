import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { identifyUser, resetAnalytics } from '../analytics.js';
import useInactivityTimer from '../hooks/useInactivityTimer.js';
import SessionWarningModal from '../components/SessionWarningModal.jsx';

// Timeout durations — easy to adjust
const ADMIN_TIMEOUT_MS  = 30 * 60 * 1000; // 30 minutes
const STUDENT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS  =  1 * 60 * 1000; //  1 minute before logout

const AuthContext = createContext(null);

// Exported so api.js can call it to signal activity on every request
export let signalActivity = () => {};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  const logoutRef = useRef(null);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && typeof parsed.id !== 'undefined' && typeof parsed.role === 'string') {
          setToken(storedToken);
          setUser(parsed);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  function login(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    setShowWarning(false);
    identifyUser(user.id, { name: user.name, email: user.email, role: user.role });
  }

  const logout = useCallback((opts = {}) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(prev => {
      const role = prev?.role;
      if (opts.inactivity) {
        toast('You\'ve been logged out due to inactivity.', { icon: '🔒' });
        setTimeout(() => navigate(role === 'admin' ? '/admin/login' : '/login'), 0);
      }
      return null;
    });
    setShowWarning(false);
    resetAnalytics();
  }, [navigate]);

  // Keep a ref so the timer callbacks always call the latest logout
  logoutRef.current = logout;

  const handleWarning = useCallback(() => setShowWarning(true), []);
  const handleTimeout = useCallback(() => {
    setShowWarning(false);
    logoutRef.current({ inactivity: true });
  }, []);

  const timeoutMs = user?.role === 'admin' ? ADMIN_TIMEOUT_MS : STUDENT_TIMEOUT_MS;

  const { resetTimer } = useInactivityTimer({
    timeout: timeoutMs,
    warningBefore: WARNING_BEFORE_MS,
    onWarning: handleWarning,
    onTimeout: handleTimeout,
    enabled: !!user,
  });

  // Expose resetTimer so api.js interceptor can call it
  useEffect(() => {
    signalActivity = resetTimer;
    return () => { signalActivity = () => {}; };
  }, [resetTimer]);

  function updateUser(updates) {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }

  function handleStayLoggedIn() {
    setShowWarning(false);
    resetTimer();
  }

  function handleLogoutNow() {
    setShowWarning(false);
    logout();
    navigate(user?.role === 'admin' ? '/admin/login' : '/login');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
      {showWarning && (
        <SessionWarningModal
          secondsRemaining={WARNING_BEFORE_MS / 1000}
          onStayLoggedIn={handleStayLoggedIn}
          onLogoutNow={handleLogoutNow}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
