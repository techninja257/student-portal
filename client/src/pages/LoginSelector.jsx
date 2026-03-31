import { useNavigate } from 'react-router-dom';

export default function LoginSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center mb-10">
        <h1 className="font-headline font-black text-4xl text-primary tracking-tight">Student Portal</h1>
        <div className="w-12 h-0.5 bg-primary rounded-full mt-3 mx-auto mb-4" />
        <p className="text-on-surface-variant font-medium text-sm">Select your account type to sign in</p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {/* Student card */}
        <button
          onClick={() => navigate('/login')}
          className="flex-1 bg-white rounded-xl border border-outline-variant/20 shadow-[0_4px_20px_rgba(0,101,101,0.06)] p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-[0_8px_32px_rgba(0,101,101,0.14)] hover:scale-[1.02] hover:border-primary/20 transition-all duration-200 group"
        >
          <div className="w-16 h-16 rounded-xl bg-secondary-container flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-primary text-[36px]">school</span>
          </div>
          <h2 className="font-headline font-bold text-xl text-on-surface mb-2">Student</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            Access your results and academic records
          </p>
          <span className="mt-auto text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Sign in
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </span>
        </button>

        {/* Admin card */}
        <button
          onClick={() => navigate('/admin/login')}
          className="flex-1 bg-white rounded-xl border border-outline-variant/20 shadow-[0_4px_20px_rgba(0,101,101,0.06)] p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-[0_8px_32px_rgba(0,101,101,0.14)] hover:scale-[1.02] hover:border-primary/20 transition-all duration-200 group"
        >
          <div className="w-16 h-16 rounded-xl bg-secondary-container flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-primary text-[36px]">admin_panel_settings</span>
          </div>
          <h2 className="font-headline font-bold text-xl text-on-surface mb-2">Administrator</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            Manage students, departments, and results
          </p>
          <span className="mt-auto text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Sign in
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </span>
        </button>
      </div>
    </div>
  );
}
