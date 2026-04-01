import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import StudentLayout from '../../layouts/StudentLayout';
import Spinner from '../../components/Spinner';
import api, { downloadPDF } from '../../api';
import { trackEvent } from '../../analytics.js';

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function mobileTitle(title) {
  if (title.includes('\u2014')) return title.split('\u2014').pop().trim();
  return title;
}

function groupBySemester(results) {
  const map = results.reduce((acc, r) => {
    const key = r.semester_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  // Sort groups by most recent uploaded_at within each group (newest first)
  return Object.entries(map).sort(([, a], [, b]) => {
    const latestA = Math.max(...a.map(r => new Date(r.uploaded_at)));
    const latestB = Math.max(...b.map(r => new Date(r.uploaded_at)));
    return latestB - latestA;
  });
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [openGroups, setOpenGroups] = useState(new Set());

  async function handleDownload(r) {
    setDownloadingId(r.id);
    try {
      trackEvent('result_downloaded', { resultId: r.id, title: r.title });
      await downloadPDF(r.id, r.original_name);
    } catch {
      toast.error('Failed to download result');
    } finally {
      setDownloadingId(null);
    }
  }

  function toggleGroup(semesterName) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(semesterName)) {
        next.delete(semesterName);
      } else {
        next.add(semesterName);
      }
      return next;
    });
  }

  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, resultsRes] = await Promise.all([
          api.get('/student/me'),
          api.get('/student/results'),
        ]);
        setProfile(profileRes.data);
        const fetched = resultsRes.data;
        setResults(fetched);
        // Open the most recent semester group by default
        if (fetched.length > 0) {
          const grouped = groupBySemester(fetched);
          setOpenGroups(new Set([grouped[0][0]]));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const grouped = groupBySemester(results);

  return (
    <StudentLayout>
      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Profile card */}
          {profile && (
            <div className="bg-surface-low rounded-xl border-l-4 border-[#006565] border border-outline-variant/10 p-4 md:p-8">
              {/* Mobile layout */}
              <div className="flex items-center gap-4 md:hidden">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={profile.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-outline-variant/20 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="font-headline font-bold text-lg text-primary">
                      {profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-headline font-bold text-xl text-on-surface leading-tight">{profile.name}</p>
                  <p className="text-sm text-[#3e4949] mt-0.5">{profile.matric_no}</p>
                  {(profile.department_name || profile.level_name) && (
                    <p className="text-xs text-[#6e7979] mt-0.5 truncate">
                      {[profile.department_name, profile.level_name].filter(Boolean).join(' \u2022 ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden md:block">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 mb-4">
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
            </div>
          )}

          {/* Results section */}
          <div className="flex items-center gap-3 mt-6 md:mt-8 mb-4">
            <h2 className="font-headline font-bold text-xl md:text-2xl text-on-surface">My Results</h2>
            <span className="bg-secondary-container text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">{results.length}</span>
          </div>

          {results.length === 0 ? (
            <div className="mt-10 md:mt-16 text-center">
              <span className="material-symbols-outlined text-4xl md:text-6xl text-outline/30">description</span>
              <p className="text-sm md:text-base font-semibold text-on-surface-variant mt-3 md:mt-4">No results uploaded yet</p>
              <p className="text-xs md:text-sm text-outline mt-1">Your results will appear here once uploaded by the admin.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(([semesterName, items]) => {
                const isOpen = openGroups.has(semesterName);
                return (
                  <div key={semesterName}>
                    {/* Section header */}
                    <button
                      onClick={() => toggleGroup(semesterName)}
                      className="w-full flex items-center justify-between bg-[#f3f4f5] rounded-xl px-4 py-3 cursor-pointer hover:bg-[#e7e8e9] transition-colors"
                    >
                      <span className="font-semibold text-sm text-[#006565] uppercase tracking-wide">{semesterName}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#006565]/10 text-[#006565] text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                        <span className="material-symbols-outlined text-[20px] text-[#6e7979] transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          expand_more
                        </span>
                      </div>
                    </button>

                    {/* Section content */}
                    {isOpen && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {items.map((r) => (
                          <div key={r.id} className="bg-white rounded-xl border-l-4 border-primary shadow-[0_4px_20px_rgba(0,101,101,0.04)] hover:shadow-xl transition-shadow border border-outline-variant/10 p-4 md:p-5">
                            {/* Mobile card layout */}
                            <div className="flex items-center justify-between gap-3 md:hidden">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2">{mobileTitle(r.title)}</p>
                                <p className="text-xs text-[#6e7979] mt-1">{fmt(r.uploaded_at)}</p>
                              </div>
                              <button
                                onClick={() => handleDownload(r)}
                                disabled={downloadingId === r.id}
                                className="w-10 h-10 rounded-full bg-[#006565]/5 flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors active:bg-[#006565]/10"
                                aria-label="Download PDF"
                              >
                                <span className="material-symbols-outlined text-[20px] text-[#006565]">
                                  {downloadingId === r.id ? 'hourglass_empty' : 'download'}
                                </span>
                              </button>
                            </div>

                            {/* Desktop card layout */}
                            <div className="hidden md:block">
                              <p className="text-[10px] uppercase tracking-widest font-semibold text-primary mb-1">{r.semester_name}</p>
                              <p className="font-headline font-bold text-on-surface text-lg">{r.title}</p>
                              <p className="text-xs text-outline mt-1">{fmt(r.uploaded_at)}</p>
                              <button
                                onClick={() => handleDownload(r)}
                                disabled={downloadingId === r.id}
                                className="mt-4 flex items-center gap-1.5 border border-primary text-primary px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/5 disabled:opacity-50 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                {downloadingId === r.id ? 'Downloading...' : 'Download PDF'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </StudentLayout>
  );
}
