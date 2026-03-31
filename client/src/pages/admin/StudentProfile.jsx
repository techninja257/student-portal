import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '../../layouts/AdminLayout';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import api from '../../api';

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const emptyUpload = { semester_id: '', title: '', file: null };

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [modal, setModal] = useState(null); // null | 'upload' | { type: 'delete', item }
  const [form, setForm] = useState(emptyUpload);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const autoTitleRef = useRef('');

  useEffect(() => {
    api.get(`/students/${id}`)
      .then(({ data }) => setStudent(data))
      .catch(() => toast.error('Student not found'))
      .finally(() => setLoadingStudent(false));

    fetchResults();
  }, [id]);

  async function fetchResults() {
    setLoadingResults(true);
    try {
      const { data } = await api.get('/results', { params: { student_id: id, limit: 100 } });
      setResults(data.results);
    } finally {
      setLoadingResults(false);
    }
  }

  async function openUpload() {
    const { data } = await api.get('/semesters', { params: { limit: 100 } });
    setSemesters(data.semesters);
    setForm(emptyUpload);
    setFileName('');
    autoTitleRef.current = '';
    setModal('upload');
  }

  function handleSemesterChange(e) {
    const semId = e.target.value;
    const sem = semesters.find(s => String(s.id) === semId);
    setForm(f => {
      if (sem && student) {
        const generated = `${student.name} \u2014 ${sem.name}`;
        if (!f.title || f.title === autoTitleRef.current) {
          autoTitleRef.current = generated;
          return { ...f, semester_id: semId, title: generated };
        }
      } else if (!f.title || f.title === autoTitleRef.current) {
        autoTitleRef.current = '';
        return { ...f, semester_id: semId, title: '' };
      }
      return { ...f, semester_id: semId };
    });
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setForm(f => ({ ...f, file }));
      setFileName(file.name);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.file) return toast.error('Please select a PDF file');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('student_id', id);
      fd.append('semester_id', form.semester_id);
      fd.append('title', form.title);
      fd.append('pdf', form.file);
      await api.post('/results', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Result uploaded');
      setModal(null);
      fetchResults();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(result) {
    try {
      const { data } = await api.get(`/results/${result.id}/download`);
      window.open(data.url, '_blank');
    } catch {
      toast.error('Failed to get download link');
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/results/${modal.item.id}`);
      toast.success('Result deleted');
      setModal(null);
      fetchResults();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition';

  return (
    <AdminLayout>
      {/* Back link */}
      <button
        onClick={() => navigate('/admin/students')}
        className="inline-flex items-center gap-1 text-sm text-outline hover:text-on-surface transition mb-6"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Back to Students
      </button>

      {loadingStudent ? (
        <Spinner />
      ) : !student ? (
        <p className="text-on-surface-variant">Student not found.</p>
      ) : (
        <>
          {/* Profile header */}
          <div className="bg-[#f3f4f5] rounded-xl p-8 mb-6 flex items-center gap-6">
            {student.profile_image_url ? (
              <img
                src={student.profile_image_url}
                alt={student.name}
                className="w-24 h-24 rounded-full object-cover shrink-0 border-2 border-outline-variant/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                <span className="font-bold text-primary text-2xl">{initials(student.name)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-1">{student.name}</h1>
              <p className="text-sm text-on-surface-variant mb-1">{student.email}</p>
              <p className="text-sm text-on-surface-variant mb-3 font-mono">{student.matric_no}</p>
              <div className="flex flex-wrap gap-2">
                {student.department_name && (
                  <span className="inline-flex items-center gap-1.5 bg-[#e1e3e4] text-on-surface-variant text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">account_balance</span>
                    {student.department_name}
                  </span>
                )}
                {student.level_name && (
                  <span className="inline-flex items-center gap-1.5 bg-[#e1e3e4] text-on-surface-variant text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">layers</span>
                    {student.level_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Results section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="font-headline font-bold text-lg text-on-surface">Results</h2>
              {!loadingResults && (
                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {results.length}
                </span>
              )}
            </div>
            <button
              onClick={openUpload}
              className="flex items-center gap-2 bg-gradient-to-br from-[#006565] to-[#008080] text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-90 transition"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Upload Result
            </button>
          </div>

          {loadingResults ? (
            <Spinner />
          ) : (
            <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border border-outline-variant/10 overflow-hidden">
              {results.length === 0 ? (
                <div className="py-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline/30">folder_open</span>
                  <p className="text-on-surface-variant font-semibold mt-3">No results uploaded yet for this student.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-low text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant text-left">
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Semester</th>
                        <th className="px-6 py-4">Uploaded</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.id} className="border-t border-outline-variant/10 hover:bg-surface/50 transition-colors">
                          <td className="px-6 py-4 text-on-surface font-medium">{r.title}</td>
                          <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">{r.semester_name}</td>
                          <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">{fmt(r.uploaded_at)}</td>
                          <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                            <button
                              onClick={() => handleDownload(r)}
                              className="text-primary hover:text-primary-container font-medium text-sm"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => setModal({ type: 'delete', item: r })}
                              className="text-[#ba1a1a] hover:opacity-70 font-medium text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Upload modal */}
      {modal === 'upload' && (
        <Modal title="Upload Result" onClose={() => setModal(null)}>
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Semester</label>
              <select required value={form.semester_id} onChange={handleSemesterChange} className={inputCls}>
                <option value="" disabled>Select Semester</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={inputCls}
                placeholder="e.g. First Semester Results 2024/2025"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">PDF File</label>
              <label className="flex items-center gap-3 border border-outline-variant/30 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-surface-low transition-colors">
                <span className="material-symbols-outlined text-primary text-[20px]">upload_file</span>
                <span className="text-sm text-primary font-semibold">Choose file</span>
                <span className="text-sm text-outline truncate">{fileName || 'No file chosen'}</span>
                <input type="file" accept=".pdf" required onChange={handleFileChange} className="hidden" />
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition">Cancel</button>
              <button type="submit" disabled={saving} className="bg-gradient-to-br from-[#006565] to-[#008080] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
                {saving ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {modal?.type === 'delete' && (
        <Modal title="Delete Result" onClose={() => setModal(null)}>
          <p className="text-on-surface-variant text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold text-on-surface">{modal.item.title}</span>? This will permanently remove the file from storage.
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
