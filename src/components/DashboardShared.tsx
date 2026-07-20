'use client';

import Link from 'next/link';
import { CATEGORY_COLORS, CATEGORY_ICON, CATEGORY_LABEL, STATUS_LABEL } from '@/lib/interventionData';
import type { Intervention } from '@/lib/interventionData';

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{children}</h2>;
}

export function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

export function FilterChipSm({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-1 rounded-md border whitespace-nowrap transition-all ${
        active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  );
}

export function KpiCard({
  label, value, unit, color, valueColor,
}: { label: string; value: string | number; unit?: string; color: string; valueColor: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}{unit}</div>
      <div className="text-xs text-slate-500 mt-1 leading-tight">{label}</div>
    </div>
  );
}

/**
 * variant:
 * - 'category' — subtitle shows ref + category icon/label (demandeur view)
 * - 'site'     — subtitle shows ref + site (électricien view)
 * - 'full'     — subtitle shows ref + site + prestataire, plus category badge (directeur/DG view)
 */
export function HistoryRow({
  item,
  variant = 'full',
  showEntity = false,
}: {
  item: Intervention;
  variant?: 'category' | 'site' | 'full';
  showEntity?: boolean;
}) {
  const c = CATEGORY_COLORS[item.category];

  const subtitle =
    variant === 'category' ? (
      <>{item.ref} · {CATEGORY_ICON[item.category]} {CATEGORY_LABEL[item.category]}</>
    ) : variant === 'site' ? (
      <>{item.ref} · {item.site}</>
    ) : (
      <>
        {showEntity && <span className="font-medium text-slate-500 mr-1">[{item.entity}]</span>}
        {item.ref} · 📍 {item.site}{item.prestataire ? ` · 👤 ${item.prestataire}` : ''}
      </>
    );

  const statusBadge = (
    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
      item.status === 'termine' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {STATUS_LABEL[item.status]}
    </span>
  );

  return (
    <Link
      href={`/demandes/${item.id}`}
      className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-colors"
    >
      <div className={`w-1 self-stretch rounded-full ${c.bar}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{item.title}</div>
        <div className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</div>
      </div>
      {variant === 'full' ? (
        <div className="shrink-0 flex flex-col items-end gap-1">
          {statusBadge}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${c.badge}`}>
            {CATEGORY_ICON[item.category]} {CATEGORY_LABEL[item.category]}
          </span>
        </div>
      ) : (
        <div className="shrink-0">{statusBadge}</div>
      )}
    </Link>
  );
}
