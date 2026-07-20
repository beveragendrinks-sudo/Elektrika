'use client';

import Link from 'next/link';
import { CATEGORY_COLORS, CATEGORY_ICON, timeSince } from '@/lib/interventionData';
import type { Intervention } from '@/lib/interventionData';

const DEMO_TODAY = '2026-07-16';
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function buildDays() {
  const today = new Date(DEMO_TODAY);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      dayName: DAY_SHORT[d.getDay()],
      label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
      isToday: date === DEMO_TODAY,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    };
  });
}

export default function TwoWeekCalendar({ interventions }: { interventions: Intervention[] }) {
  const days = buildDays();

  const planned = interventions.filter(
    i => (i.status === 'planifiee' || i.status === 'en_cours') && i.plannedDate,
  );

  function itemsForDay(date: string) {
    return planned
      .filter(i => i.plannedDate === date)
      .sort((a, b) => Number(b.isCritical) - Number(a.isCritical));
  }

  const hasSomething = days.some(d => itemsForDay(d.date).length > 0);

  if (!hasSomething) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-400">
        Aucune intervention planifiée sur les 2 prochaines semaines
      </div>
    );
  }

  return (
    <div>
      {/* ── Mobile: list grouped by day ──────────────────────────── */}
      <div className="lg:hidden space-y-5">
        {days.map(day => {
          const items = itemsForDay(day.date);
          if (items.length === 0) return null;
          return (
            <div key={day.date}>
              <div className={`text-xs font-bold mb-2 flex items-center gap-2 ${day.isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                {day.isToday ? "📌 Aujourd'hui" : `${day.dayName} ${day.label}`}
                <span className="font-normal text-[10px] opacity-70">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map(item => {
                  const c = CATEGORY_COLORS[item.category];
                  return (
                    <Link
                      key={item.id}
                      href={`/demandes/${item.id}`}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border hover:opacity-80 transition-opacity ${c.badge}`}
                    >
                      <span className="text-lg shrink-0 mt-0.5">{CATEGORY_ICON[item.category]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900 leading-snug line-clamp-2">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          📍 {item.site}{item.prestataire ? ` · 👤 ${item.prestataire}` : ''}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {item.isCritical && <span className="text-red-500">⚡</span>}
                        <span className="text-[10px] text-slate-400">{timeSince(item.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: horizontal day grid ─────────────────────────── */}
      <div className="hidden lg:flex gap-2 overflow-x-auto pb-2">
        {days.map(day => {
          const items = itemsForDay(day.date);
          return (
            <div
              key={day.date}
              className={`flex-shrink-0 w-36 rounded-xl border overflow-hidden ${
                day.isToday
                  ? 'border-blue-400 shadow-md'
                  : day.isWeekend
                  ? 'border-slate-100 opacity-70'
                  : 'border-slate-200'
              }`}
            >
              {/* Day header */}
              <div
                className={`px-2 py-1.5 text-center ${
                  day.isToday ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide">{day.dayName}</div>
                <div className="text-[10px] opacity-80">{day.label}</div>
              </div>

              {/* Cards */}
              <div className="p-1.5 space-y-1.5 bg-white min-h-[56px]">
                {items.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-200">—</div>
                ) : (
                  items.map(item => {
                    const c = CATEGORY_COLORS[item.category];
                    return (
                      <Link
                        key={item.id}
                        href={`/demandes/${item.id}`}
                        className={`block rounded-lg p-1.5 hover:opacity-80 transition-opacity border ${c.badge}`}
                      >
                        <div className="flex items-start gap-1">
                          <span className="text-xs shrink-0">{CATEGORY_ICON[item.category]}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold leading-tight line-clamp-2">
                              {item.title}
                            </div>
                            {item.isCritical && <span className="text-red-500 text-[10px]">⚡ Critique</span>}
                            {item.prestataire && (
                              <div className="text-[10px] opacity-60 truncate mt-0.5">
                                {item.prestataire.split(' ')[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
