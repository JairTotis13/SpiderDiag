import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { LogIn, Wrench } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { sileo } from 'sileo';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setToken = useAuthStore((s) => s.setToken);
  const { register, handleSubmit } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const tokenResp = await authService.login(data);
      setToken(tokenResp.access_token);
      const user = await authService.getMe();
      login(user, tokenResp.access_token, tokenResp.refresh_token);
      sileo.success({ title: `Bienvenido, ${user.full_name}` });
      navigate('/');
    } catch {
      sileo.error({ title: 'Credenciales inválidas' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#08080f] px-4">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-indigo-500/[0.04] blur-[140px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-500/[0.04] blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo section */}
        <div className="mb-10 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/20 blur-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 ring-1 ring-white/[0.06]">
                <img src="/spider.svg" alt="SpiderDiag" className="h-10 w-10 drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Spider
                </span>
                <span className="text-white/90">Diag</span>
              </h1>
              <p className="mt-1.5 text-sm text-gray-600">
                Plataforma Profesional de Diagnóstico Automotriz
              </p>
            </div>
          </div>
        </div>

        {/* Login form card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a]/80 p-8 shadow-2xl shadow-indigo-500/[0.02] backdrop-blur-xl">
          <h2 className="mb-6 text-lg font-semibold text-white/90">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Correo electrónico</label>
              <input
                type="email"
                {...register('email', { required: true })}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 transition-all focus:border-indigo-500/50 focus:bg-white/[0.04] focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="admin@spiderdiag.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Contraseña</label>
              <input
                type="password"
                {...register('password', { required: true })}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 transition-all focus:border-indigo-500/50 focus:bg-white/[0.04] focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0" />
              <LogIn size={18} className="relative" />
              <span className="relative">{loading ? 'Ingresando...' : 'Ingresar'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-600">
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              ¿No tienes cuenta? Regístrate
            </Link>
            <span className="mx-2">•</span>
            <Link to="/recovery" className="text-gray-500 hover:text-gray-400 transition-colors">
              Recuperar contraseña
            </Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-5 rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 text-xs">
          <p className="mb-1.5 font-medium text-gray-400">Credenciales de demo</p>
          <div className="space-y-1 text-gray-600">
            <p className="font-mono">
              <span className="text-gray-500">Email:</span> admin@spiderdiag.com
            </p>
            <p className="font-mono">
              <span className="text-gray-500">Pass:</span> Admin123!
            </p>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-gray-700">
            <Wrench size={11} className="text-indigo-500" />
            Requiere adaptador OBD-II físico para diagnóstico
          </p>
        </div>
      </div>
    </div>
  );
}
