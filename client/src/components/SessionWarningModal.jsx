import { useEffect, useState } from 'react';

export default function SessionWarningModal({ secondsRemaining, onStayLoggedIn, onLogoutNow }) {
  const [count, setCount] = useState(secondsRemaining);

  useEffect(() => {
    setCount(secondsRemaining);
  }, [secondsRemaining]);

  useEffect(() => {
    if (count <= 0) return;
    const id = setInterval(() => setCount(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#fff3e0] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#e65100] text-[22px]">timer</span>
          </div>
          <div>
            <h2 className="font-headline font-bold text-lg text-on-surface">Session Expiring</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              You'll be logged out in{' '}
              <span className="font-semibold text-on-surface">{count}</span> second{count !== 1 ? 's' : ''} due to inactivity.
            </p>
          </div>
        </div>

        {/* Countdown bar */}
        <div className="w-full h-1.5 bg-surface-low rounded-full overflow-hidden">
          <div
            className="h-full bg-[#e65100] rounded-full transition-all duration-1000"
            style={{ width: `${Math.max(0, (count / secondsRemaining) * 100)}%` }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onLogoutNow}
            className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:bg-surface-low transition"
          >
            Logout Now
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#006565] to-[#008080] text-white text-sm font-semibold hover:opacity-90 transition"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
