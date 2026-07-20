'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface FMSession {
  email: string;
  role: string;
  label: string;
  dashboard: string;
}

const ROLE_BADGE: Record<string, string> = {
  admin:             'bg-purple-100 text-purple-700',
  directeur_general: 'bg-red-100 text-red-700',
  directeur_de_site: 'bg-amber-100 text-amber-700',
  electricien:       'bg-blue-100 text-blue-700',
  demandeur:         'bg-green-100 text-green-700',
};

interface MockNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  time: string;
  read: boolean;
  icon: string;
}

const ago = (h: number) => {
  if (h < 1) return `il y a ${Math.round(h * 60)} min`;
  return `il y a ${Math.round(h)}h`;
};

const MOCK_NOTIFICATIONS: Record<string, MockNotification[]> = {
  directeur_de_site: [
    { id: 'n1', title: 'BC en attente de validation', body: 'BC-LAD-2026-000041 — Variateur de fréquence · 742,500 TND', href: '/bons-de-commande/bc-1', time: ago(2), read: false, icon: '📋' },
    { id: 'n2', title: 'Devis reçu — DEM-2026-048', body: 'Bois & Design Tunis — 1 850 TND · Menuiserie', href: '/demandes/5', time: ago(4), read: false, icon: '📄' },
    { id: 'n3', title: 'Escalade SLA — DEM-2026-049', body: 'Fissures mur parking · 96h dépassées sans action', href: '/demandes/6', time: ago(8), read: true, icon: '🚨' },
  ],
  directeur_general: [
    { id: 'n4', title: 'Escalade SLA groupe', body: '3 demandes dépassent le seuil 96h — intervention requise', href: '/demandes', time: ago(1), read: false, icon: '🚨' },
    { id: 'n5', title: 'Budget LAD — 72% consommé', body: 'Alerte budget · 92 800 / 130 000 TND engagés', href: '/kpi', time: ago(12), read: false, icon: '💰' },
  ],
  electricien: [
    { id: 'n6', title: 'Nouvelle mission planifiée', body: 'DEM-2026-041 · Siège Ben Arous · Demain 08h00', href: '/dashboard/electricien', time: ago(0.5), read: false, icon: '📅' },
    { id: 'n7', title: 'Confirmation requise', body: 'DEM-2026-035 — Climatiseur H4 · En attente depuis 4h', href: '/demandes/3', time: ago(4), read: true, icon: '✅' },
  ],
  demandeur: [
    { id: 'n8', title: 'Intervention planifiée', body: 'DEM-2026-041 · Panne disjoncteur · Demain 09h30', href: '/demandes/1', time: ago(3), read: false, icon: '📅' },
  ],
};

function buildNavLinks(role: string): { href: string; label: string }[] {
  switch (role) {
    case 'demandeur':
      return [
        { href: '/demandes', label: 'Mes demandes' },
        { href: '/bons-de-commande', label: 'Bons de commande' },
      ];
    case 'electricien':
      return [
        { href: '/demandes', label: 'Demandes' },
        { href: '/planning', label: 'Planning' },
        { href: '/ordres-de-travail', label: 'Mes OTs' },
        { href: '/bons-de-commande', label: 'Bons de commande' },
      ];
    case 'directeur_de_site':
      return [
        { href: '/demandes', label: 'Demandes' },
        { href: '/bons-de-commande', label: 'Bons de commande' },
        { href: '/settings', label: 'Paramètres' },
      ];
    case 'directeur_general':
      return [
        { href: '/demandes', label: 'Demandes' },
        { href: '/kpi', label: 'KPI' },
        { href: '/settings', label: 'Paramètres' },
      ];
    case 'admin':
      return [
        { href: '/demandes', label: 'Demandes' },
        { href: '/bons-de-commande', label: 'BCs' },
        { href: '/kpi', label: 'KPI' },
        { href: '/settings', label: 'Paramètres' },
      ];
    default:
      return [
        { href: '/demandes', label: 'Demandes' },
        { href: '/kpi', label: 'KPI' },
      ];
  }
}

function displayName(email: string): string {
  return email
    .split('@')[0]
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Header() {
  const router   = useRouter();
  const pathname = usePathname();
  const [session, setSession]         = useState<FMSession | null>(null);
  const [mounted, setMounted]         = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<MockNotification[]>([]);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('fm_session');
      if (raw) {
        const parsed: FMSession = JSON.parse(raw);
        setSession(parsed);
        const roleNotifs = MOCK_NOTIFICATIONS[parsed.role] ?? [];
        setNotifications(roleNotifs);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }, [pathname]);

  function logout() {
    localStorage.removeItem('fm_session');
    setSession(null);
    router.push('/login');
  }

  const navLinks = session ? buildNavLinks(session.role) : [];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">

        {/* Logo — pointe sur le dashboard si connecté */}
        <Link href={session?.dashboard ?? '/login'} className="leading-tight shrink-0 mr-2">
          <div className="font-bold text-base tracking-tight text-slate-900">🏢 Facility Manager</div>
          <div className="text-[10px] text-slate-400 hidden sm:block leading-tight">
            Maintenance multi-sites · Groupe Elkateb
          </div>
        </Link>

        {/* Nav links — role-aware, masqués pendant l'hydratation */}
        {mounted && (
          <>
            <nav className="flex items-center gap-0.5 flex-1">
              {navLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(l.href)
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Cloche + identité + déconnexion */}
            <div className="flex items-center gap-2 shrink-0">
              {session && notifications.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen(o => !o)}
                    className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <>
                      {/* Overlay pour fermer en cliquant ailleurs */}
                      <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />

                      {/* Dropdown panel */}
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                          <div className="font-semibold text-slate-900 text-sm">Notifications</div>
                          {notifications.some(n => !n.read) && (
                            <button
                              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Tout marquer lu
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                          {notifications.map(n => (
                            <Link
                              key={n.id}
                              href={n.href}
                              onClick={() => {
                                setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                                setNotifOpen(false);
                              }}
                              className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                            >
                              <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm leading-tight ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                  {n.title}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 leading-tight truncate">{n.body}</div>
                                <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                              </div>
                              {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />}
                            </Link>
                          ))}
                        </div>
                        {notifications.every(n => n.read) && (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">Aucune notification non lue</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {session ? (
                <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-slate-800 leading-tight">
                      {displayName(session.email)}
                    </div>
                    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-tight ${ROLE_BADGE[session.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {session.label}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Déconnexion"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Connexion
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
