import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../layouts/AdminLayout';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import Pagination from '../../components/Pagination';
import api from '../../api';

function fmt(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const LIMIT = 20;

export default function Departments() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { type: 'form', item? } | { type: 'delete', item }
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchPage(page = 1) {
    setLoading(true);
    try {
      const { data } = await api.get('/departments', { params: { page, limit: LIMIT } });
      setItems(data.departments);
      setPagination({ total: data.total, page: data.page, totalPages: data.totalPages });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPage(); }, []);

  function openAdd() {
    setName('');
    setModal({ type: 'form' });
  }

  function openEdit(item) {
    setName(item.name);
    setModal({ type: 'form', item });
  }

  function openDelete(item) {
    setModal({ type: 'delete', item });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.item) {
        await api.put(`/departments/${modal.item.id}`, { name });
        toast.success('Department updated');
      } else {
        await api.post('/departments', { name });
        toast.success('Department created');
      }
      setModal(null);
      fetchPage(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/departments/${modal.item.id}`);
      toast.success('Department deleted');
      setModal(null);
      fetchPage(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-6">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-gradient-to-br from-[#006565] to-[#008080] text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-90 transition"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Department
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border border-outline-variant/10 overflow-hidden">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/30">folder_open</span>
              <p className="text-on-surface-variant font-semibold mt-3">No departments yet</p>
              <p className="text-sm text-outline mt-1">Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant text-left">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-outline-variant/10 hover:bg-surface/50 transition-colors">
                      <td className="px-6 py-4 text-on-surface font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-on-surface-variant hidden sm:table-cell">{fmt(item.created_at)}</td>
                      <td className="px-6 py-4 text-right space-x-3">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-primary hover:text-primary-container font-medium text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDelete(item)}
                          className="text-error hover:opacity-70 font-medium text-sm"
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
        onPageChange={fetchPage}
      />

      {modal?.type === 'form' && (
        <Modal
          title={modal.item ? 'Edit Department' : 'Add Department'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-br from-[#006565] to-[#008080] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <Modal title="Delete Department" onClose={() => setModal(null)}>
          <p className="text-on-surface-variant text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold text-on-surface">{modal.item.name}</span>?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setModal(null)}
              className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="bg-[#ba1a1a] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
