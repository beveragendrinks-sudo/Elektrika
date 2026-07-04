'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Demo credentials — in production, Supabase Auth handles this
const DEMO_USERS: Record<string, { password: string; role: string; label: string; dashboard: string }> = {
  'admin@elektrika.tn':   { password: 'facility2026', role: 'admin',              label: 'Administrateur',      dashboard: '/settings' },
  'dg@elektrika.tn':      { password: 'facility2026', role: 'directeur_general',  label: 'Directeur Général',   dashboard: '/dashboard/dg' },
  'directeur@lad.tn':     { password: 'facility2026', role: 'directeur_de_site',  label: 'Directeur de site',   dashboard: '/dashboard/directeur' },
  'electricien@lad.tn':   { password: 'facility2026', role: 'electricien',        label: 'Prestataire de service',         dashboard: '/dashboard/electricien' },
  'demandeur@lad.tn':     { password: 'facility2026', role: 'demandeur',          label: 'Demandeur',           dashboard: '/demandes' },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));

    const user = DEMO_USERS[email.trim().toLowerCase()];
    if (user && password === user.password) {
      router.push(user.dashboard);
    } else {
      setError('Email ou mot de passe incorrect. Vérifiez vos identifiants ou contactez votre administrateur.');
      setLoading(false);
    }
  }

  function fillDemo(email: string) {
    setEmail(email);
    setPassword('facility2026');
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }}
      />

      {/* Branding */}
      <div className="mb-8 text-center relative z-10">
        <div className="text-4xl font-black text-white tracking-tight">🏢 Facility Manager</div>
        <div className="text-slate-400 text-sm mt-1.5">Maintenance Électrique Industrielle · Multi-sites &amp; Multi-entités</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8">
          <h1 className="text-xl font-bold text-slate-900">Connexion</h1>
          <p className="text-slate-500 text-sm mt-1">Saisissez vos identifiants professionnels.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email professionnel</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="votre.nom@societe.tn"
                required
                autoComplete="email"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3.5 py-2.5 leading-relaxed">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Connexion en cours…
                </>
              ) : 'Se connecter →'}
            </button>
          </form>

          {/* Links */}
          <div className="flex items-center justify-between mt-4 text-xs">
            <Link href="/login/forgot-password" className="text-slate-500 hover:text-slate-900 transition-colors">
              Mot de passe oublié ?
            </Link>
            <Link href="/login/register" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
              Demander un accès →
            </Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="border-t border-slate-100 bg-slate-50 px-8 py-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Accès démo</div>
          <div className="space-y-1.5">
            {Object.entries(DEMO_USERS).map(([em, { label }]) => (
              <button
                key={em}
                type="button"
                onClick={() => fillDemo(em)}
                className="block w-full text-left group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-600 group-hover:text-slate-900 transition-colors">{em}</span>
                  <span className="text-slate-400 shrink-0 ml-2">{label}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-3 italic">Mot de passe commun : facility2026</div>
        </div>
      </div>

      <div className="mt-6 text-slate-600 text-xs text-center relative z-10">
        © 2026 Facility Manager · Groupe Elkateb — Maintenance multi-sites
      </div>
    </div>
  );
}
