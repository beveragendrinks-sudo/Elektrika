'use client';

import Link from 'next/link';
import { CATEGORY_COLORS, CATEGORY_ICON, CATEGORY_LABEL, timeSince } from '@/lib/interventionData';
import type { Intervention } from '@/lib/interventionData';

interface InterventionCardProps {
  item: Intervention;
  compact?: boolean;
}

export default function InterventionCard({ item, compact = false }: InterventionCardProps) {
  const c = CATEGORY_COLORS[item.category];

  return (
    <Link
      href={`/demandes/${item.id}`}
      className="flex bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all overflow-hidden"
    >
      {/* Category color strip */}
      <div className={`w-1.5 shrink-0 ${c.bar}`} />

      <div className="flex-1 p-3 min-w-0">
        {/* Top row: ref + age + critical */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className="text-[10px] font-mono text-slate-400 truncate">{item.ref}</span>
          <div className="flex items-center gap-1 shrink-0">
            {item.isCritical && (
              <span title="Intervention critique" className="text-red-500 text-sm leading-none">⚡</span>
            )}
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {timeSince(item.createdAt)}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className={`font-semibold text-slate-900 leading-snug ${compact ? 'text-xs' : 'text-sm'} line-clamp-2 mb-2`}>
          {item.title}
        </div>

        {/* Footer: category badge + site + prestataire */}
        {compact ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${c.badge}`}>
              {CATEGORY_ICON[item.category]}
            </span>
            <span className="text-[10px] text-slate-500 truncate">{item.site}</span>
          </div>
        ) : (
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border ${c.badge}`}>
              {CATEGORY_ICON[item.category]} {CATEGORY_LABEL[item.category]}
            </span>
            <div className="text-xs text-slate-500 truncate">📍 {item.site}</div>
            {item.prestataire && (
              <div className="text-xs text-slate-500 truncate">👤 {item.prestataire}</div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
