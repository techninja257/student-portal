import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../layouts/AdminLayout';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import Pagination from '../../components/Pagination';
import api, { downloadPDF } from '../../api';
import { trackEvent } from '../../analytics.js';

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StudentSearchInput({ onSelect, label = 'Student' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/students', { params: { search: val, limit: 8 } });
        setSuggestions(data.students);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  }

  function handleSelect(student) {
    setSelected(student);
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    onSelect(student);
  }

  function handleClear() {
    setSelected(null);
    onSelect(null);
  }

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">{label}</label>
      <div ref={wrapperRef} className="relative">
        {selected ? (
          <span className="bg-teal-50 border border-teal-200 rounded-full px-3 py-1 inline-flex items-center gap-2 text-sm">
            {selected.profile_image_url && (
              <img src={selected.profile_image_url} alt={selected.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
            )}
            <span className="font-semibold text-teal-800">{selected.name}</span>
            <span className="text-teal-500 text-xs">{selected.matric_no}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 text-teal-400 hover:text-teal-700 leading-none transition"
            >
              &times;
            </button>
          </span>
        ) : (
          <>
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              placeholder="Search student by name, email, or matric no..."
              className="w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
            {open && suggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-outline-variant/20 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {suggestions.map(s => (
                  <li
                    key={s.id}
                    onMouseDown={() => handleSelect(s)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-low cursor-pointer transition-colors"
                  >
                    {s.profile_image_url ? (
                      <img src={s.profile_image_url} alt={s.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {s.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{s.name}</p>
                      <p className="text-xs text-outline">{s.matric_no}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const emptyForm = { semester_id: '', title: '', file: null };
const LIMIT = 20;

export default function Results() {
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formStudent, setFormStudent] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  // track last auto-generated title so we don't overwrite custom edits
  const autoTitleRef = useRef('');

  async function fetchResults(studentId = '', page = 1) {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (studentId) params.student_id = studentId;
      const { data } = await api.get('/results', { params });
      setResults(data.results);
      setPagination({ total: data.total, page: data.page, totalPages: data.totalPages });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchResults(); }, []);

  function handleFilterSelect(student) {
    setFilterStudent(student);
    fetchResults(student?.id || '', 1);
  }

  async function openUpload() {
    const semRes = await api.get('/semesters', { params: { limit: 100 } }).then(r => r.data);
    setSemesters(semRes.semesters);
    setForm(emptyForm);
    setFormStudent(null);
    setFileName('');
    autoTitleRef.current = '';
    setModal('upload');
  }

  // Auto-generate title when student or semester changes
  function handleFormStudentSelect(student) {
    setFormStudent(student);
    updateAutoTitle(student, form.semester_id, semesters);
  }

  function handleSemesterChange(e) {
    const semId = e.target.value;
    setForm(f => {
      updateAutoTitle(formStudent, semId, semesters, f.title);
      return { ...f, semester_id: semId };
    });
  }

  function updateAutoTitle(student, semId, semList, currentTitle) {
    const sem = semList.find(s => String(s.id) === String(semId));
    if (student && sem) {
      const generated = `${student.name} \u2014 ${sem.name}`;
      // only overwrite if title is empty or still matches last auto-generated value
      setForm(f => {
        if (!f.title || f.title === autoTitleRef.current) {
          autoTitleRef.current = generated;
          return { ...f, title: generated };
        }
        return f;
      });
    } else if (!student || !semId) {
      // clear title only if it still matches auto-generated
      setForm(f => {
        if (f.title === autoTitleRef.current) {
          autoTitleRef.current = '';
          return { ...f, title: '' };
        }
        return f;
      });
    }
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
    if (!formStudent) return toast.error('Please select a student');
    if (!form.file) return toast.error('Please select a PDF file');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('student_id', formStudent.id);
      fd.append('semester_id', form.semester_id);
      fd.append('title', form.title);
      fd.append('pdf', form.file);
      await api.post('/results', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      trackEvent('result_uploaded', { studentId: formStudent.id, semester: form.semester_id });
      toast.success('Result uploaded');
      setModal(null);
      fetchResults(filterStudent?.id || '', pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(result) {
    setDownloadingId(result.id);
    try {
      await downloadPDF(result.id, result.original_name);
    } catch {
      toast.error('Failed to download result');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/results/${modal.item.id}`);
      toast.success('Result deleted');
      setModal(null);
      fetchResults(filterStudent?.id || '', pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition';

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={openUpload}
          className="flex items-center gap-2 bg-gradient-to-br from-[#006565] to-[#008080] text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-90 transition"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          Upload Result
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 w-full sm:max-w-sm">
          <StudentSearchInput onSelect={handleFilterSelect} label="" />
        </div>
        {filterStudent && (
          <button
            onClick={() => handleFilterSelect(null)}
            className="text-xs font-semibold text-outline hover:text-on-surface transition"
          >
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border border-outline-variant/10 overflow-hidden">
          {results.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/30">folder_open</span>
              <p className="text-on-surface-variant font-semibold mt-3">No results found</p>
              <p className="text-sm text-outline mt-1">Upload a result to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant text-left">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Semester</th>
                    <th className="px-6 py-4">Uploaded</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-t border-outline-variant/10 hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-on-surface font-medium">{r.student_name}</p>
                        <p className="text-on-surface-variant text-xs">{r.matric_no}</p>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{r.title}</td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap hidden sm:table-cell">{r.semester_name}</td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">{fmt(r.uploaded_at)}</td>
                      <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => handleDownload(r)}
                          disabled={downloadingId === r.id}
                          className="text-primary hover:text-primary-container font-medium text-sm disabled:opacity-50"
                        >
                          {downloadingId === r.id ? 'Downloading...' : 'Download'}
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

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={LIMIT}
        onPageChange={(p) => fetchResults(filterStudent?.id || '', p)}
      />

      {modal === 'upload' && (
        <Modal title="Upload Result" onClose={() => setModal(null)}>
          <form onSubmit={handleUpload} className="space-y-3">
            <StudentSearchInput onSelect={handleFormStudentSelect} label="Student" />
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
