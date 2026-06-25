import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { sileo } from 'sileo';

export default function RecoveryPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      sileo.error({ title: 'Ingresa tu correo electrónico' });
      return;
    }
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setSent(true);
    } catch {
      sileo.error({ title: 'Error al enviar la solicitud' });
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
          <p className="mt-2 text-sm text-gray-600">Recuperación de contraseña</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0e0e1a] p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="mb-4 inline-flex rounded-full bg-emerald-500/10 p-4">
                <Mail size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Solicitud enviada</h2>
              <p className="mt-3 text-sm text-gray-400">
                Si el correo existe, recibirás un enlace de recuperación
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:underline transition-colors"
              >
                <ArrowLeft size={16} />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-6 text-xl font-semibold">Recuperar contraseña</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="tecnico@taller.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
                >
                  <Send size={18} />
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-400 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
