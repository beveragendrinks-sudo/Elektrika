'use client';
// ============================================================
// LOT — Composant UI : Timeline de demande (vue chef d'usine)
// Objectif : clarté immédiate, sans lecture de table SQL.
// Code couleur : vert = dans les temps, orange = alerte bas niveau,
// rouge = escalade direction dépassée.
// ============================================================

import { useMemo } from 'react';
import type { RequestStatus } from '@/types';

const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Brouillon',
  pending_management_validation: 'Validation direction',
  clarification: 'Clarification',
  preparation: 'Préparation',
  ready_to_plan: 'Prête à planifier',
  planned: 'Planifiée',
  in_progress: "En cours d'exécution",
  cancelled: 'Annulée',
  completed_pending_confirmation: 'Attente confirmation',
  accepted: 'Acceptée',
};

const STATUS_ORDER: RequestStatus[] = [
  'draft', 'pending_management_validation', 'clarification', 'preparation',
  'ready_to_plan', 'planned', 'in_progress', 'completed_pending_confirmation', 'accepted',
];

export interface TimelineStep {
  status: RequestStatus;
  entered_at: string;
  exited_at: string | null;
  reason?: string | null;
  low_alert_hours?: number | null;
  escalation_hours?: number | null;
}

interface RequestTimelineProps {
  requestTitle: string;
  equipmentName: string;
  siteName: string;
  steps: TimelineStep[];
  currentStatus: RequestStatus;
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} j`;
}

function stepSeverity(step: TimelineStep): 'ok' | 'warning' | 'critical' {
  const endTime = step.exited_at ? new Date(step.exited_at).getTime() : Date.now();
  const hoursElapsed = (endTime - new Date(step.entered_at).getTime()) / (1000 * 60 * 60);
  if (step.escalation_hours != null && hoursElapsed >= step.escalation_hours) return 'critical';
  if (step.low_alert_hours != null && hoursElapsed >= step.low_alert_hours) return 'warning';
  return 'ok';
}

const SEVERITY_COLOR: Record<string, string> = {
  ok: '#16a34a',
  warning: '#ea580c',
  critical: '#dc2626',
};

export default function RequestTimeline({
  requestTitle,
  equipmentName,
  siteName,
  steps,
  currentStatus,
}: RequestTimelineProps) {
  const orderedSteps = useMemo(
    () => [...steps].sort((a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime()),
    [steps]
  );

  const totalHours = useMemo(() => {
    return orderedSteps.reduce((sum, s) => {
      const end = s.exited_at ? new Date(s.exited_at).getTime() : Date.now();
      return sum + (end - new Date(s.entered_at).getTime()) / (1000 * 60 * 60);
    }, 0);
  }, [orderedSteps]);

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{requestTitle}</h2>
          <p className="text-sm text-slate-500">{equipmentName} — {siteName}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Durée totale</div>
          <div className="text-lg font-semibold text-slate-900">{formatDuration(totalHours)}</div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status, idx) => {
          const step = orderedSteps.find((s) => s.status === status);
          const isCurrent = status === currentStatus;
          const isPast = step != null;
          const severity = step ? stepSeverity(step) : 'ok';

          return (
            <div key={status} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5 w-28">
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                  style={{
                    backgroundColor: isPast ? SEVERITY_COLOR[severity] : '#e2e8f0',
                    borderColor: isCurrent ? '#1e293b' : 'transparent',
                  }}
                  title={STATUS_LABELS[status]}
                />
                <span
                  className={`text-[11px] text-center leading-tight ${
                    isCurrent ? 'font-semibold text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
                {step && (
                  <span className="text-[10px] text-slate-400">
                    {formatDuration(
                      ((step.exited_at ? new Date(step.exited_at).getTime() : Date.now()) -
                        new Date(step.entered_at).getTime()) /
                        (1000 * 60 * 60)
                    )}
                  </span>
                )}
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div
                  className="h-0.5 w-6 flex-shrink-0"
                  style={{ backgroundColor: isPast ? '#cbd5e1' : '#e2e8f0' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {orderedSteps.some((s) => s.reason) && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-500 mb-2">Motifs enregistrés</div>
          <ul className="space-y-1">
            {orderedSteps
              .filter((s) => s.reason)
              .map((s, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <span className="font-medium">{STATUS_LABELS[s.status]} :</span> {s.reason}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR.ok }} />
          Dans les temps
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR.warning }} />
          Alerte (retard)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR.critical }} />
          Escalade direction
        </div>
      </div>
    </div>
  );
}
