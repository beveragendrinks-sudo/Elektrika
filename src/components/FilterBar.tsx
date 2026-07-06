'use client';

import { INTERVENTION_CATEGORIES } from '@/lib/interventionTypes';
import type { InterventionCategory } from '@/types';

export type ActiveCategories = InterventionCategory[];
export type ActiveTypes = (1 | 2 | 3)[];

const TYPES: { key: 1 | 2 | 3; label: string }[] = [
  { key: 1, label: 'Type 1 — Panne simple' },
  { key: 2, label: 'Type 2 — Réparation' },
  { key: 3, label: 'Type 3 — Travaux' },
];

interface FilterBarProps {
  selectedCategories: ActiveCategories;
  selectedTypes: ActiveTypes;
  onCategoriesChange: (cats: ActiveCategories) => void;
  onTypesChange: (types: ActiveTypes) => void;
  resultCount?: number;
  totalCount?: number;
  /** When set, only these category chips are shown. If exactly 1, displays as a specialisation badge instead of a filter. */
  allowedCategories?: InterventionCategory[];
}

export default function FilterBar({
  selectedCategories,
  selectedTypes,
  onCategoriesChange,
  onTypesChange,
  resultCount,
  totalCount,
  allowedCategories,
}: FilterBarProps) {
  const hasFilter = selectedCategories.length > 0 || selectedTypes.length > 0;

  function toggleCat(id: InterventionCategory) {
    onCategoriesChange(
      selectedCategories.includes(id)
        ? selectedCategories.filter(c => c !== id)
        : [...selectedCategories, id]
    );
  }

  function toggleType(key: 1 | 2 | 3) {
    onTypesChange(
      selectedTypes.includes(key)
        ? selectedTypes.filter(t => t !== key)
        : [...selectedTypes, key]
    );
  }

  const categoriesToShow = allowedCategories
    ? INTERVENTION_CATEGORIES.filter(c => allowedCategories.includes(c.id))
    : INTERVENTION_CATEGORIES;

  // Single specialisation: show as badge, no chip filter needed
  const singleSpec = allowedCategories?.length === 1
    ? categoriesToShow[0]
    : null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">

      {/* Category row — badge if single specialisation, chips otherwise */}
      {singleSpec ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-20 shrink-0">Spécialisation</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900 text-white">
            <span>{singleSpec.icon}</span>
            {singleSpec.label}
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1.5 w-20 shrink-0">Catégorie</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categoriesToShow.map(cat => {
              const active = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCat(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Type row */}
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1.5 w-20 shrink-0">Type</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPES.map(t => {
            const active = selectedTypes.includes(t.key);
            return (
              <button
                key={t.key}
                onClick={() => toggleType(t.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {hasFilter && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {resultCount !== undefined && totalCount !== undefined ? (
              <>
                <span className="font-semibold text-slate-700">{resultCount}</span>
                {' '}/ {totalCount} résultats
              </>
            ) : (
              'Filtre actif'
            )}
          </span>
          <button
            onClick={() => { onCategoriesChange([]); onTypesChange([]); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Réinitialiser ×
          </button>
        </div>
      )}
    </div>
  );
}
