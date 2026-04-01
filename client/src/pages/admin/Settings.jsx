import { useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../api';

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Settings() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setSaving(true);
    try {
      await api.put('/auth/admin/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully');
      setForm(emptyForm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full bg-[#f3f4f5] border-none rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20 transition';

  return (
    <AdminLayout>
      <div className="max-w-md">
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,101,101,0.04)] border border-outline-variant/10 p-8">
          <h2 className="font-headline font-bold text-lg text-on-surface mb-6">Change Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                required
                value={form.currentPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">New Password</label>
              <input
                type="password"
                name="newPassword"
                required
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant mb-1.5">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputCls}
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-br from-[#006565] to-[#008080] text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
