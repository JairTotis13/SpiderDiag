import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { sileo } from 'sileo';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

interface RoleOption {
  id: number;
  name: string;
  description: string | null;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role_id: 0,
  });

  useEffect(() => {
    authService.getRoles().then(setRoles).catch(() => {});
  }, []);

  const validate = (): string | null => {
    if (!form.full_name.trim()) return 'El nombre completo es obligatorio';
    if (!form.email.trim()) return 'El correo electrónico es obligatorio';
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (form.password !== form.confirm_password) return 'Las contraseñas no coinciden';
    if (!form.role_id) return 'Selecciona un rol';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      sileo.error({ title: error });
      return;
    }
    setLoading(true);
    try {
      await authService.register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        role_id: form.role_id,
      });
      const token = await authService.login({
        email: form.email.trim(),
        password: form.password,
      });
      const user = await authService.getMe();
      login(user, token.access_token, token.refresh_token);
      sileo.success({ title: `Bienvenido, ${user.full_name}` });
      navigate('/');
    } catch {
      sileo.error({ title: 'Error al registrarse' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08080f] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3">
            <img src="/spider.svg" alt="SpiderDiag" className="h-12 w-12" />
            <h1 className="text-3xl font-bold">
              <span className="text-indigo-400">Spider</span>
              <span className="text-white">Diag</span>
            </h1>
          </div>
          <p className="mt-2 text-sm text-gray-600">Crear una cuenta nueva</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/[0.08] bg-[#0e0e1a] p-8 shadow-2xl"
        >
          <h2 className="mb-6 text-xl font-semibold">Registro</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Nombre completo *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Correo electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="tecnico@taller.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="+52 555 123 4567"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 pr-10 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Confirmar contraseña *</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 pr-10 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Repite la contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Rol *</label>
              <select
                value={form.role_id || ''}
                onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="">Seleccionar rol...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
          >
            <UserPlus size={18} />
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
