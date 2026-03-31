import { useEffect, useState } from 'react';
import StudentLayout from '../../layouts/StudentLayout';
import Spinner from '../../components/Spinner';
import api from '../../api';

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, resultsRes] = await Promise.all([
          api.get('/student/me'),
          api.get('/student/results'),
        ]);
        setProfile(profileRes.data);
        setResults(resultsRes.data);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return (
    <StudentLayout>
      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Profile card */}
          {profile && (
            <div className="bg-surface-low rounded-xl p-8 border-l-4 border-[#006565] border border-outline-variant/10">
              <div className="flex items-center gap-5 mb-4">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-outline-variant/20 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="font-headline font-bold text-2xl text-primary">
                      {profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="font-headline font-extrabold text-3xl text-on-surface">{profile.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1 bg-surface-high rounded-full px-3 py-1 text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">badge</span>
                  {profile.matric_no}
                </span>
                {profile.department_name && (
                  <span className="flex items-center gap-1 bg-surface-high rounded-full px-3 py-1 text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">account_balance</span>
                    {profile.department_name}
                  </span>
                )}
                {profile.level_name && (
                  <span className="flex items-center gap-1 bg-surface-high rounded-full px-3 py-1 text-xs uppercase tracking-wider font-semibold text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">layers</span>
                    {profile.level_name}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Results section */}
          <div className="flex items-center gap-3 mt-8 mb-4">
            <h2 className="font-headline font-bold text-lg text-on-surface">My Results</h2>
            <span className="bg-secondary-container text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">{results.length}</span>
          </div>

          {results.length === 0 ? (
            <div className="mt-16 text-center">
              <span className="material-symbols-outlined text-6xl text-outline/30">description</span>
              <p className="text-base font-semibold text-on-surface-variant mt-4">No results uploaded yet</p>
              <p className="text-sm text-outline mt-1">Your results will appear here once uploaded by the admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border-l-4 border-primary shadow-[0_4px_20px_rgba(0,101,101,0.04)] hover:shadow-xl p-5 transition-shadow border border-outline-variant/10">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-primary mb-1">{r.semester_name}</p>
                  <p className="font-headline font-bold text-on-surface text-lg">{r.title}</p>
                  <p className="text-xs text-outline mt-1">{fmt(r.uploaded_at)}</p>
                  <button
                    onClick={() => window.open(r.cloudinary_url, '_blank')}
                    className="mt-4 flex items-center gap-1.5 border border-primary text-primary px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </StudentLayout>
  );
}
