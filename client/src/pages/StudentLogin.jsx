import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../analytics.js';

export default function StudentLogin() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleRequestOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/student/request-otp', { email });
      toast.success('OTP sent to your email');
      trackEvent('otp_requested');
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/student/verify-otp', { email, code: otp });
      login(data.token, data.user);
      trackEvent('student_login_success');
      toast.success('Welcome back!');
      navigate('/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative bg-white rounded-xl shadow-[0_4px_40px_rgba(0,101,101,0.10)] border border-outline-variant/10 p-8 w-full max-w-md">
        <h1 className="font-headline font-black text-2xl text-primary tracking-tight">Student Portal</h1>
        <div className="w-8 h-0.5 bg-primary rounded-full mt-2 mb-6" />

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp}>
            <p className="text-sm font-medium text-on-surface-variant mb-5">Enter your registered email to receive a one-time login code.</p>
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Email Address</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#f3f4f5] border-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 bg-gradient-to-br from-[#006565] to-[#008080] text-white rounded-xl py-2.5 font-semibold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? 'Sending...' : 'Send Code'}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p className="text-sm font-medium text-on-surface-variant mb-5">
              Enter the 6-digit code sent to <span className="font-semibold text-on-surface">{email}</span>
            </p>
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Verification Code</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-[#f3f4f5] border-none rounded-xl px-4 py-2.5 text-sm text-on-surface text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 bg-gradient-to-br from-[#006565] to-[#008080] text-white rounded-xl py-2.5 font-semibold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); }}
              className="text-sm text-outline hover:text-on-surface transition flex items-center gap-1 mt-3"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              Use a different email
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <a href="/" className="text-xs text-outline hover:text-on-surface transition inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Back to account selection
          </a>
        </div>
      </div>
    </div>
  );
}
