import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from 'sileo';

export function Layout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#08080f]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-indigo-500/[0.03] blur-[120px]" />
        <div className="absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-500/[0.03] blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.02] blur-[100px]" />
      </div>

      <Sidebar />
      <main className="relative flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="bottom-right"
        theme="dark"
        offset={16}
      />
    </div>
  );
}
