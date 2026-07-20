'use client';

import Link from 'next/link';

type Role = 'demandeur' | 'electricien' | 'directeur' | 'dg';

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
  style: 'primary' | 'secondary' | 'outline';
}

function getNavItems(role: Role): NavItem[] {
  if (role === 'electricien') {
    return [
      { href: '/planning?view=today',         label: 'Travaux du jour',       shortLabel: "Aujourd'hui", icon: '⚡', style: 'primary'   },
      { href: '/planning',                    label: 'Planning hebdomadaire', shortLabel: 'Planning',    icon: '📅', style: 'secondary' },
      { href: '/demandes/new?as=prestataire', label: 'Signaler anomalie',     shortLabel: 'Signaler',    icon: '+',  style: 'outline'   },
    ];
  }

  if (role === 'demandeur') {
    return [
      { href: '/demandes/new',                label: 'Nouvelle demande',      shortLabel: 'Demande',     icon: '+',  style: 'primary'   },
      { href: '/demandes',                    label: 'Mes demandes',          shortLabel: 'Demandes',    icon: '≡',  style: 'secondary' },
      { href: '/demandes?status=termine',     label: 'Historique',            shortLabel: 'Historique',  icon: '🕐', style: 'outline'   },
    ];
  }

  if (role === 'directeur') {
    return [
      { href: '/planning?view=today',         label: 'Travaux du jour',       shortLabel: "Aujourd'hui", icon: '📋', style: 'primary'   },
      { href: '/planning',                    label: 'Planning hebdomadaire', shortLabel: 'Planning',    icon: '📅', style: 'secondary' },
      { href: '/demandes',                    label: 'Tableau des demandes',  shortLabel: 'Demandes',    icon: '≡',  style: 'outline'   },
      { href: '/demandes?status=termine',     label: 'Historique',            shortLabel: 'Historique',  icon: '🕐', style: 'outline'   },
      { href: '/kpi',                         label: 'Performance',           shortLabel: 'Performance', icon: '📊', style: 'outline'   },
    ];
  }

  // dg
  return [
    { href: '/demandes',                    label: 'Tableau des demandes',  shortLabel: 'Demandes',    icon: '≡',  style: 'primary'   },
    { href: '/kpi',                         label: 'Performance',           shortLabel: 'Performance', icon: '📊', style: 'secondary' },
    { href: '/bons-de-commande',            label: 'Bons de commande',      shortLabel: 'BC',          icon: '📋', style: 'outline'   },
    { href: '/demandes?status=termine',     label: 'Historique',            shortLabel: 'Historique',  icon: '🕐', style: 'outline'   },
  ];
}

const desktopStyle: Record<NavItem['style'], string> = {
  primary:   'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'bg-blue-600 text-white hover:bg-blue-700',
  outline:   'border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900',
};

const mobileIconStyle: Record<NavItem['style'], string> = {
  primary:   'bg-slate-900 text-white',
  secondary: 'bg-blue-600 text-white',
  outline:   'bg-slate-100 text-slate-700',
};

export function QuickBarDesktop({ role }: { role: Role }) {
  const items = getNavItems(role);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors ${desktopStyle[item.style]}`}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function QuickBarMobile({ role }: { role: Role }) {
  const items = getNavItems(role);
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-3">
      <div className="flex items-center justify-around gap-1 max-w-sm mx-auto">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 min-w-0"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold ${mobileIconStyle[item.style]}`}>
              {item.icon}
            </div>
            <span className="text-[9px] text-slate-600 font-medium text-center leading-tight max-w-[56px]">
              {item.shortLabel}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
