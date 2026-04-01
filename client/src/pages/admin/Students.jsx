import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../../layouts/AdminLayout';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import Pagination from '../../components/Pagination';
import api from '../../api';
import { trackEvent } from '../../analytics.js';

const emptyForm = { name: '', email: '', matric_no: '', department_id: '', level_id: '', photo: null };

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function Avatar({ src, name, size = 'sm' }) {
  const dim = size === 'lg' ? 'w-20 h-20 text-xl' : 'w-8 h-8 text-xs';
  if (src) {
    return <img src={src} alt={name} className={`${dim} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${dim} rounded-full bg-secondary-container flex items-center justify-center shrink-0`}>
      <span className="font-bold text-primary">{initials(name)}</span>
    </div>
  );
}

const LIMIT = 20;

export default function Students() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  async function fetchStudents(q = '', page = 1) {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (q) params.search = q;
      const { data } = await api.get('/students', { params });
      setStudents(data.students);
      setPagination({ total: data.total, page: data.page, totalPages: data.totalPages });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStudents(); }, []);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStudents(val, 1), 300);
  }

  async function openForm(item) {
    const [deptsRes, lvlsRes] = await Promise.all([
      api.get('/departments', { params: { limit: 100 } }).then(r => r.data),
      api.get('/levels', { params: { limit: 100 } }).then(r => r.data),
    ]);
    setDepartments(deptsRes.departments);
    setLevels(lvlsRes.levels);
    if (item) {
      setForm({
        name: item.name,
        email: item.email,
        matric_no: item.matric_no,
        department_id: item.department_id ?? '',
        level_id: item.level_id ?? '',
        photo: null,
      });
      setPhotoPreview(item.profile_image_url || null);
      setModal({ type: 'form', item });
    } else {
      setForm(emptyForm);
      setPhotoPreview(null);
      setModal({ type: 'form' });
    }
  }

  function field(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('matric_no', form.matric_no);
      fd.append('department_id', form.department_id);
      fd.append('level_id', form.level_id);
      if (form.photo) fd.append('photo', form.photo);

      if (modal.item) {
        await api.put(`/students/${modal.item.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Student updated');
      } else {
        await api.post('/students', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        trackEvent('student_registered');
        toast.success('Student created');
      }
      setModal(null);
      fetchStudents(search, pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/students/${modal.item.id}`);
      toast.success('Student deleted');
      setModal(null);
      fetchStudents(search, pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition';

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-6">
        <div className="relative w-full sm:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or matric number..."
            className="w-full bg-surface-low border-none rounded-xl px-4 py-2.5 pl-10 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>
        <button
          onClick={() => openForm(null)}
          className="flex items-center gap-2 bg-gradient-to-br from-[#006565] to-[#008080] text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-90 transition shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Student
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border border-outline-variant/10 overflow-hidden">
          {students.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/30">folder_open</span>
              <p className="text-on-surface-variant font-semibold mt-3">No students found</p>
              <p className="text-sm text-outline mt-1">Try adjusting your search or add a new student.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant text-left">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Matric No</th>
                    <th className="px-6 py-4 hidden md:table-cell">Department</th>
                    <th className="px-6 py-4 hidden md:table-cell">Level</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-t border-outline-variant/10 hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar src={s.profile_image_url} name={s.name} />
                          <button
                            onClick={() => navigate(`/admin/students/${s.id}`)}
                            className="text-[#006565] font-medium hover:underline cursor-pointer"
                          >
                            {s.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-on-surface-variant">{s.email}</td>
                      <td className="px-6 py-3 text-on-surface-variant whitespace-nowrap">{s.matric_no}</td>
                      <td className="px-6 py-3 text-on-surface-variant hidden md:table-cell">{s.department_name || '—'}</td>
                      <td className="px-6 py-3 text-on-surface-variant hidden md:table-cell">{s.level_name || '—'}</td>
                      <td className="px-6 py-3 text-right space-x-3 whitespace-nowrap">
                        <button onClick={() => navigate(`/admin/students/${s.id}`)} className="text-primary hover:text-primary-container font-medium text-sm">View</button>
                        <button onClick={() => openForm(s)} className="text-primary hover:text-primary-container font-medium text-sm">Edit</button>
                        <button onClick={() => setModal({ type: 'delete', item: s })} className="text-error hover:opacity-70 font-medium text-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={LIMIT}
        onPageChange={(p) => fetchStudents(search, p)}
      />

      {modal?.type === 'form' && (
        <Modal title={modal.item ? 'Edit Student' : 'Add Student'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-3">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-3 pb-2">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-outline-variant/20" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-surface-high flex items-center justify-center border-2 border-dashed border-outline-variant/40">
                  <span className="material-symbols-outlined text-outline text-[32px]">person</span>
                </div>
              )}
              <label className="flex items-center gap-1.5 text-xs font-semibold text-primary cursor-pointer hover:opacity-70 transition">
                <span className="material-symbols-outlined text-[16px]">upload</span>
                {photoPreview ? 'Change photo' : 'Upload photo'}
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Name</label>
              <input type="text" required value={form.name} onChange={e => field('name', e.target.value)} className={inputCls} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={e => field('email', e.target.value)} className={inputCls} placeholder="student@example.com" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Matric No</label>
              <input type="text" required value={form.matric_no} onChange={e => field('matric_no', e.target.value)} className={inputCls} placeholder="e.g. CSC/2021/001" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Department</label>
              <select required value={form.department_id} onChange={e => field('department_id', e.target.value)} className={inputCls}>
                <option value="" disabled>Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Level</label>
              <select required value={form.level_id} onChange={e => field('level_id', e.target.value)} className={inputCls}>
                <option value="" disabled>Select Level</option>
                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition">Cancel</button>
              <button type="submit" disabled={saving} className="bg-gradient-to-br from-[#006565] to-[#008080] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Delete Student" onClose={() => setModal(null)}>
          <p className="text-on-surface-variant text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold text-on-surface">{modal.item.name}</span>? This will also delete all their results.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="bg-[#ba1a1a] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
