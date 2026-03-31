import AdminLayout from '../layouts/AdminLayout';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Welcome to Admin Panel</h2>
        <p className="text-gray-500 mt-1 text-sm">Use the sidebar to manage students, results, and settings.</p>
      </div>
    </AdminLayout>
  );
}
