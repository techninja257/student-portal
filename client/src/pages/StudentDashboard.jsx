import { useEffect, useState } from 'react';
import StudentLayout from '../layouts/StudentLayout';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get('/student/me').then(({ data }) => setProfile(data)).catch(() => {});
    api.get('/student/results').then(({ data }) => setResults(data)).catch(() => {});
  }, []);

  return (
    <StudentLayout>
      <div className="space-y-6">
        {profile && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">My Profile</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-gray-500">Name</dt>
              <dd className="text-gray-900 font-medium">{profile.name}</dd>
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-900">{profile.email}</dd>
              <dt className="text-gray-500">Matric No.</dt>
              <dd className="text-gray-900">{profile.matric_no}</dd>
              <dt className="text-gray-500">Department</dt>
              <dd className="text-gray-900">{profile.department_name || '—'}</dd>
              <dt className="text-gray-500">Level</dt>
              <dd className="text-gray-900">{profile.level_name || '—'}</dd>
            </dl>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Results</h2>
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm">No results uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.semester_name}</p>
                  </div>
                  <a
                    href={r.cloudinary_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
