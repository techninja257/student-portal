import { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import Spinner from '../../components/Spinner';
import api from '../../api';

const cards = [
  { key: 'students', label: 'Total Students', icon: 'groups' },
  { key: 'departments', label: 'Total Departments', icon: 'account_balance' },
  { key: 'levels', label: 'Total Levels', icon: 'layers' },
  { key: 'results', label: 'Total Results', icon: 'analytics' },
];

export default function Dashboard() {
  const [counts, setCounts] = useState({ students: 0, departments: 0, levels: 0, results: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const p = { limit: 1 };
        const [students, departments, levels, results] = await Promise.all([
          api.get('/students', { params: p }),
          api.get('/departments', { params: p }),
          api.get('/levels', { params: p }),
          api.get('/results', { params: p }),
        ]);
        setCounts({
          students: students.data.total,
          departments: departments.data.total,
          levels: levels.data.total,
          results: results.data.total,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return (
    <AdminLayout>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map(({ key, label, icon }) => (
            <div key={key} className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border border-outline-variant/10 p-6 hover:scale-[1.02] transition-transform cursor-default">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1">{label}</p>
              <p className="font-headline font-bold text-3xl text-on-surface">{counts[key]}</p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
