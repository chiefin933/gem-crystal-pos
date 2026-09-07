import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@gemandcrystal.co.ke');
  const [password, setPassword] = useState('GemAdmin@2024');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-max-w-md max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-xl shadow-rose-600/20 mb-4 border border-rose-400/20">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Gem & Crystal</h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-rose-400 mt-1">
            Store Owner Control Panel
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-800">
            <Shield className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-semibold text-zinc-300">Secure Merchant Authentication</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-950/50 border border-rose-800/50 rounded-xl flex items-start gap-3 text-rose-200 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Merchant Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500 transition"
                  placeholder="admin@gemandcrystal.co.ke"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Store Panel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@gemandcrystal.co.ke');
                setPassword('GemAdmin@2024');
              }}
              className="text-xs text-zinc-500 hover:text-rose-400 underline underline-offset-4 transition"
            >
              Auto-fill Owner Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
