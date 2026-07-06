import Link from 'next/link';

interface OTRow {
  id: string;
  ot_number: string;
  status: 'planned' | 'in_progress' | 'completed';
  mission_date: string;
  title: string;
  site: string;
  electrician: string;
  entity: string;
}

const MOCK_OTS: OTRow[] = [
  { id: 'ot-4', ot_number: 'OT-LAD-2026-000025', status: 'planned',    mission_date: '2026-07-02', title: 'Disjoncteur Atelier C',          site: 'Pôle Industriel Jbel Oust', electrician: 'Mohamed Salah', entity: 'LAD' },
  { id: 'ot-8', ot_number: 'OT-LAD-2026-000027', status: 'planned',    mission_date: '2026-07-02', title: 'Vérification tableau BT',        site: 'Pôle Industriel Jbel Oust', electrician: 'Mohamed Salah', entity: 'LAD' },
  { id: 'ot-5', ot_number: 'OT-LAD-2026-000026', status: 'planned',    mission_date: '2026-07-03', title: 'Remplacement variateur V-08',    site: 'Megrine',                   electrician: 'Mohamed Salah', entity: 'LAD' },
  { id: 'ot-1', ot_number: 'OT-LAD-2026-000024', status: 'in_progress',mission_date: '2026-07-01', title: 'Panne tableau TGS-B2',           site: 'Siège Ben Arous',           electrician: 'Mohamed Salah', entity: 'LAD' },
  { id: 'ot-3', ot_number: 'OT-LAD-2026-000022', status: 'completed',  mission_date: '2026-06-30', title: 'Câblage armoire AT-04',          site: 'Siège Ben Arous',           electrician: 'Mohamed Salah', entity: 'LAD' },
  { id: 'ot-6', ot_number: 'OT-LAD-2026-000021', status: 'completed',  mission_date: '2026-06-30', title: 'Vérification disjoncteur ligne D',site: 'Siège Ben Arous',           electrician: 'Karim Bejaoui', entity: 'LAD' },
];

const STATUS_LABEL: Record<OTRow['status'], string> = {
  planned:    'Planifié',
  in_progress:'En cours',
  completed:  'Terminé',
};

const STATUS_COLOR: Record<OTRow['status'], string> = {
  planned:    'bg-indigo-100 text-indigo-700',
  in_progress:'bg-cyan-100 text-cyan-700',
  completed:  'bg-green-100 text-green-700',
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}

export default function OrdresDeTravailPage() {
  const today     = MOCK_OTS.filter(ot => isToday(ot.mission_date) || ot.status === 'in_progress');
  const upcoming  = MOCK_OTS.filter(ot => ot.mission_date > new Date().toISOString().slice(0, 10) && ot.status === 'planned');
  const completed = MOCK_OTS.filter(ot => ot.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ordres de travail</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {MOCK_OTS.length} OTs · {today.length} aujourd&apos;hui ou en cours
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Aujourd'hui / En cours", count: today.length + MOCK_OTS.filter(ot=>ot.status==='in_progress').length, color: 'bg-cyan-50 border-cyan-200 text-cyan-800' },
          { label: 'À venir',   count: upcoming.length,  color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
          { label: 'Terminés',  count: completed.length, color: 'bg-green-50 border-green-200 text-green-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section : aujourd'hui / en cours */}
      {(today.length > 0 || MOCK_OTS.some(ot => ot.status === 'in_progress')) && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Aujourd&apos;hui &amp; En cours
          </h2>
          <OTList items={MOCK_OTS.filter(ot => ot.status === 'in_progress' || isToday(ot.mission_date))} />
        </section>
      )}

      {/* Section : à venir */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">À venir</h2>
          <OTList items={upcoming} />
        </section>
      )}

      {/* Section : terminés */}
      {completed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Terminés</h2>
          <OTList items={completed} />
        </section>
      )}
    </div>
  );
}

function OTList({ items }: { items: OTRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {items.map((ot) => (
        <Link
          key={ot.id}
          href={`/ordres-de-travail/${ot.id}`}
          className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {ot.title}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono text-slate-400">{ot.ot_number}</span>
              {' · '}{ot.site}
              {' · '}<span className="font-medium text-slate-600">{ot.electrician}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400">📅 {fmtDate(ot.mission_date)}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[ot.status]}`}>
              {STATUS_LABEL[ot.status]}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
