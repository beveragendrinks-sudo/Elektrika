'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }}
      />

      <div className="mb-8 text-center relative z-10">
        <div className="text-3xl font-black text-white tracking-tight">🏢 Facility Manager</div>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="p-8">
          {sent ? (
            <div className="text-center py-2">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-lg font-bold text-slate-900">Email envoyé</h2>
              <p className="text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                Un lien de réinitialisation a été envoyé à&nbsp;
                <span className="font-semibold text-slate-700">{email}</span>.
                Vérifiez votre boîte de réception (et les spams).
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Si vous ne recevez pas l&apos;email sous 5 minutes, contactez votre administrateur.
              </p>
              <Link href="/login" className="text-sm font-semibold text-blue-600 hover:underline">
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mb-5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Retour à la connexion
              </Link>
              <h1 className="text-xl font-bold text-slate-900">Mot de passe oublié</h1>
              <p className="text-slate-500 text-sm mt-1 mb-6">
                Saisissez votre email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email professionnel</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre.nom@societe.tn"
                    required
                    autoComplete="email"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Envoi en cours…
                    </>
                  ) : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
