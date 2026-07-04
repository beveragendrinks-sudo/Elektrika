'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
interface BCLine {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface EntityProfile {
  code: string;
  full_name: string;
  address: string;
  phone: string;
  matricule_fiscale: string;
}

interface BCData {
  po_number: string;
  status: string;
  created_at: string;
  entity: string;
  electrician: string;
  demande: { id: string; title: string; site: string; type: string; entity: string; location_comment?: string };
  supplier: { name: string; contact: string; phone: string; email: string; address: string };
  lines: BCLine[];
  notes: string;
}

// ── Profils d'entités (configurables dans Settings → Paramètres entités) ───
// En production : fetch depuis group_entities avec colonnes full_name, address, phone, matricule_fiscale
const ENTITY_PROFILES: Record<string, EntityProfile> = {
  LAD: {
    code: 'LAD',
    full_name: 'Société LAD',
    address: 'Zone Industrielle Charguia II, 2035 Ariana',
    phone: '+216 71 234 000',
    matricule_fiscale: '1234567/A/M/000',
  },
  FAD: {
    code: 'FAD',
    full_name: 'FAD Industrie S.A.R.L.',
    address: 'Pôle Industriel Jbel Oust, 2082 Jbel Oust',
    phone: '+216 72 345 678',
    matricule_fiscale: '2345678/B/P/000',
  },
  BTFI: {
    code: 'BTFI',
    full_name: 'BTFI Technologie',
    address: 'Sénia Beni Khaled, 8061 Beni Khaled',
    phone: '+216 72 456 789',
    matricule_fiscale: '3456789/C/N/000',
  },
  '3Ps': {
    code: '3Ps',
    full_name: '3Ps Solutions',
    address: 'Route de Megrine, 2033 Megrine',
    phone: '+216 71 567 890',
    matricule_fiscale: '4567890/D/M/000',
  },
  'K&Ko': {
    code: 'K&Ko',
    full_name: 'K&Ko Groupe',
    address: 'Zone Carthage, 2016 Carthage',
    phone: '+216 71 678 901',
    matricule_fiscale: '5678901/E/M/000',
  },
};

// ── Mock BCs (remplacé par fetch Supabase) ─────────────────────────────────
const MOCK_BCS: Record<string, BCData> = {
  'bc-1': {
    po_number: 'BC-LAD-2026-000041',
    status: 'draft',
    created_at: '2026-06-30',
    entity: 'LAD',
    electrician: 'Mohamed Salah',
    demande: {
      id: '5',
      title: 'Remplacement variateur V-08',
      site: 'Megrine',
      type: 'Réparation avec matériel',
      entity: 'LAD',
      location_comment: 'Atelier production — armoire électrique principale',
    },
    supplier: {
      name: 'Elkateb Electricité',
      contact: 'M. Adnen Elkateb',
      phone: '+216 71 234 567',
      email: 'contact@elkateb.tn',
      address: '12 Rue de Tunis, Ben Arous 2013',
    },
    lines: [
      { description: 'Variateur de fréquence ABB ACS580 7.5kW', quantity: 1, unit: 'pièce', unit_price: 680 },
      { description: 'Câble H07V-U 6mm² (rouge)', quantity: 10, unit: 'ml', unit_price: 2.5 },
      { description: 'Connecteurs type F - lot 10 pièces', quantity: 2, unit: 'lot', unit_price: 18.75 },
    ],
    notes: 'Livraison souhaitée avant le 05/07/2026. Contacter M. Salah avant livraison.',
  },
  'bc-2': {
    po_number: 'BC-LAD-2026-000038',
    status: 'confirmed',
    created_at: '2026-06-25',
    entity: 'LAD',
    electrician: 'Mohamed Salah',
    demande: {
      id: '3',
      title: 'Câblage armoire AT-04',
      site: 'Siège Ben Arous',
      type: 'Travaux électriques',
      entity: 'LAD',
      location_comment: 'Salle des machines — niveau 2',
    },
    supplier: {
      name: 'Tunisie Électrique',
      contact: 'M. Kamel Ben Ali',
      phone: '+216 70 123 456',
      email: 'vente@tunisie-elec.tn',
      address: '45 Avenue Habib Bourguiba, Tunis 1001',
    },
    lines: [
      { description: 'Câble armé XLPE 4×10mm²', quantity: 25, unit: 'ml', unit_price: 8.4 },
      { description: 'Disjoncteur différentiel 40A 30mA', quantity: 2, unit: 'pièce', unit_price: 45 },
    ],
    notes: '',
  },
};

// ── Statuts ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon — En attente de validation',
  sent: 'Envoyé au fournisseur',
  confirmed: 'Confirmé par le fournisseur',
  received: 'Reçu',
  cancelled: 'Annulé',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-amber-700 bg-amber-50 border-amber-200',
  sent: 'text-blue-700 bg-blue-50 border-blue-200',
  confirmed: 'text-violet-700 bg-violet-50 border-violet-200',
  received: 'text-green-700 bg-green-50 border-green-200',
  cancelled: 'text-red-700 bg-red-50 border-red-200',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── BC Document ────────────────────────────────────────────────────────────
function BCDocument({ bc, docRef }: { bc: BCData; docRef: React.RefObject<HTMLDivElement> }) {
  const grandTotal = bc.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const entity = ENTITY_PROFILES[bc.entity] ?? {
    code: bc.entity,
    full_name: bc.entity,
    address: '',
    phone: '',
    matricule_fiscale: '',
  };

  return (
    <div ref={docRef} className="bg-white rounded-xl border border-slate-200 overflow-hidden">

      {/* ── Zone 1 : En-tête — Entité (gauche) / Titre BC (droite) ─────── */}
      <div className="px-10 pt-10 pb-7 border-b-2 border-slate-900">
        <div className="flex items-start justify-between gap-8">

          {/* Gauche : informations de l'entité émettrice */}
          <div className="space-y-0.5">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{entity.code}</div>
            {entity.full_name !== entity.code && (
              <div className="text-sm font-medium text-slate-600">{entity.full_name}</div>
            )}
            {entity.address && (
              <div className="text-sm text-slate-500 mt-2">{entity.address}</div>
            )}
            {entity.phone && (
              <div className="text-sm text-slate-500">Tél. : {entity.phone}</div>
            )}
            {entity.matricule_fiscale && (
              <div className="text-sm text-slate-500">MF : {entity.matricule_fiscale}</div>
            )}
          </div>

          {/* Droite : titre + numéro + date */}
          <div className="text-right shrink-0">
            <div className="text-4xl font-black text-slate-900 tracking-tight uppercase">
              Bon de Commande
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-lg font-bold text-slate-700">{bc.po_number}</div>
              <div className="text-sm text-slate-400">Date : {fmtDate(bc.created_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone 2 : Statut + Électricien ──────────────────────────────── */}
      <div className={`px-10 py-4 flex items-center justify-between border-b ${STATUS_COLOR[bc.status] ?? 'text-slate-700 bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{STATUS_LABEL[bc.status] ?? bc.status}</span>
        </div>
        <div className="text-sm">
          <span className="text-current opacity-60">Établi par : </span>
          <span className="font-semibold">{bc.electrician}</span>
          <span className="opacity-60"> — Prestataire de service</span>
        </div>
      </div>

      <div className="px-10 py-8 space-y-8">

        {/* ── Zone 3 : Demande d'intervention ────────────────────────── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Demande d&apos;intervention de référence
            </span>
          </div>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-slate-400 w-28 shrink-0">Titre</span>
              <span className="font-semibold text-slate-900">{bc.demande.title}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-28 shrink-0">Site</span>
              <span className="text-slate-700">{bc.demande.site}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-28 shrink-0">Type</span>
              <span className="text-slate-700">{bc.demande.type}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-28 shrink-0">Entité</span>
              <span className="text-slate-700">{bc.demande.entity}</span>
            </div>
            {bc.demande.location_comment && (
              <div className="flex gap-3 sm:col-span-2">
                <span className="text-slate-400 w-28 shrink-0">Localisation</span>
                <span className="text-slate-700">{bc.demande.location_comment}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Zone 4 : Fournisseur ────────────────────────────────────── */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fournisseur</span>
          </div>
          <div className="px-5 py-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex gap-3">
              <span className="text-slate-400 w-20 shrink-0">Société</span>
              <span className="font-semibold text-slate-900">{bc.supplier.name}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-20 shrink-0">Contact</span>
              <span className="text-slate-700">{bc.supplier.contact}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-20 shrink-0">Tél.</span>
              <span className="text-slate-700">{bc.supplier.phone}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 w-20 shrink-0">Email</span>
              <span className="text-slate-700">{bc.supplier.email}</span>
            </div>
            {bc.supplier.address && (
              <div className="flex gap-3 sm:col-span-2">
                <span className="text-slate-400 w-20 shrink-0">Adresse</span>
                <span className="text-slate-700">{bc.supplier.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Zone 5 : Tableau des lignes ─────────────────────────────── */}
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Désignation des matériaux / prestations
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="text-center px-4 py-3 text-xs font-semibold w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Désignation</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold w-16">Qté</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold w-20">Unité</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold w-32">P.U. (TND)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold w-32">Total (TND)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bc.lines.map((line, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-4 py-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{line.description}</td>
                    <td className="px-3 py-3 text-center text-slate-700">{line.quantity}</td>
                    <td className="px-3 py-3 text-center text-slate-500 text-xs">{line.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{fmt(line.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      {fmt(line.quantity * line.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-50">
                  <td colSpan={4}></td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-slate-600 uppercase tracking-wide">
                    Total estimé (HT)
                  </td>
                  <td className="px-4 py-4 text-right text-xl font-black text-slate-900 tabular-nums">
                    {fmt(grandTotal)}<span className="text-sm font-semibold ml-1">TND</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Zone 6 : Notes ──────────────────────────────────────────── */}
        {bc.notes && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes</div>
            <div className="text-sm text-slate-700 bg-slate-50 rounded-lg px-5 py-4 border border-slate-200 leading-relaxed">
              {bc.notes}
            </div>
          </div>
        )}

        {/* ── Zone 7 : Signatures ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-12 pt-6 border-t-2 border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Établi par</div>
            <div className="h-16 border-b border-dashed border-slate-300 mb-3"></div>
            <div className="text-sm font-semibold text-slate-800">{bc.electrician}</div>
            <div className="text-xs text-slate-400 mt-0.5">Prestataire de service · {entity.code}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Approuvé par</div>
            <div className="h-16 border-b border-dashed border-slate-300 mb-3"></div>
            <div className="text-sm font-semibold text-slate-400">Directeur — {entity.code}</div>
            <div className="text-xs text-slate-300 mt-0.5">Signature et cachet</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-300 pt-4 border-t border-slate-100">
          {bc.po_number} · {entity.full_name} · Généré via Facility Manager · {fmtDate(bc.created_at)}
        </div>
      </div>
    </div>
  );
}

// ── BC Validation Panel ────────────────────────────────────────────────────
function BCValidationPanel({ bcStatus }: { bcStatus: string }) {
  const [remarques, setRemarques] = useState('');
  const [action, setAction] = useState<'idle' | 'validating' | 'rejecting' | 'validated' | 'rejected'>('idle');

  if (bcStatus !== 'draft') return null;

  if (action === 'validated') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-5 flex items-center gap-4">
        <div className="text-3xl">✓</div>
        <div>
          <div className="font-bold text-green-800">Bon de commande validé</div>
          <div className="text-sm text-green-600 mt-0.5">Envoyé au fournisseur pour confirmation.</div>
        </div>
      </div>
    );
  }

  if (action === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-5 flex items-center gap-4">
        <div className="text-3xl">✗</div>
        <div>
          <div className="font-bold text-red-800">Bon de commande rejeté</div>
          <div className="text-sm text-red-600 mt-0.5">L&apos;électricien sera notifié pour correction.</div>
        </div>
      </div>
    );
  }

  const busy = action === 'validating' || action === 'rejecting';

  async function doAction(type: 'validating' | 'rejecting') {
    setAction(type);
    await new Promise((r) => setTimeout(r, 900));
    setAction(type === 'validating' ? 'validated' : 'rejected');
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
        <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <div className="font-semibold text-amber-900 text-sm">Validation direction requise</div>
          <div className="text-xs text-amber-700 mt-0.5">Ce bon de commande est en attente de votre approbation.</div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            Remarques <span className="font-normal text-slate-400 normal-case tracking-normal">(optionnel)</span>
          </label>
          <textarea
            value={remarques}
            onChange={(e) => setRemarques(e.target.value)}
            rows={3}
            placeholder="Commentaires sur la commande, conditions particulières, demandes de modification…"
            disabled={busy}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none transition-colors disabled:opacity-50"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => doAction('rejecting')}
            disabled={busy}
            className="flex-1 border border-red-200 text-red-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {action === 'rejecting' ? 'Rejet…' : 'Rejeter'}
          </button>
          <button
            onClick={() => doAction('validating')}
            disabled={busy}
            className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {action === 'validating' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Validation…
              </>
            ) : 'Valider le bon de commande'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inner page ─────────────────────────────────────────────────────────────
function BCPageInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';
  const requestId = searchParams.get('request_id') ?? '';
  const entityCode = searchParams.get('entity') ?? 'LAD';
  const docRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const bc: BCData | null = isPreview
    ? {
        po_number: `BC-${entityCode}-2026-${String(Date.now()).slice(-6)}`,
        status: 'draft',
        created_at: new Date().toISOString().slice(0, 10),
        entity: entityCode,
        electrician: 'Mohamed Salah',
        demande: {
          id: requestId,
          title: requestId ? `Demande #${requestId}` : 'Non associée',
          site: '—',
          type: '—',
          entity: entityCode,
        },
        supplier: { name: 'Fournisseur sélectionné', contact: '—', phone: '—', email: '—', address: '' },
        lines: [{ description: 'Articles commandés', quantity: 1, unit: 'forfait', unit_price: parseFloat(searchParams.get('total') ?? '0') }],
        notes: '',
      }
    : (MOCK_BCS[id] ?? null);

  async function downloadPDF() {
    if (!docRef.current || !bc) return;
    setGenerating(true);
    try {
      // Imports dynamiques — ne chargent pas côté serveur
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const el = docRef.current;

      // Capturer le DOM en canvas (scale 2 = haute résolution)
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width; // hauteur proportionnelle A4

      // Pagination : découpe le canvas en tranches A4
      let yOffset = 0;
      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pageW, imgH);
        yOffset += pageH;
      }

      pdf.save(`${bc.po_number}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Impossible de générer le PDF. Réessayez.');
    } finally {
      setGenerating(false);
    }
  }

  if (!bc) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-slate-600 font-medium mb-2">Bon de commande introuvable</div>
        <div className="text-slate-400 text-sm mb-6">Le BC n&apos;existe pas ou a été supprimé.</div>
        <Link href="/dashboard/electricien" className="text-blue-600 hover:underline text-sm">
          ← Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/electricien" className="hover:text-slate-900 transition-colors">
            Tableau de bord
          </Link>
          <span>/</span>
          <Link href="/demandes" className="hover:text-slate-900 transition-colors">Demandes</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">{bc.po_number}</span>
        </nav>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/bons-de-commande/new?request_id=${bc.demande.id}`}
            className="text-sm border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-lg hover:border-slate-400 transition-colors"
          >
            + Nouveau BC (même demande)
          </Link>
          <button
            onClick={downloadPDF}
            disabled={generating}
            className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Génération…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Télécharger PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <BCValidationPanel bcStatus={bc.status} />
        <BCDocument bc={bc} docRef={docRef} />
      </div>
    </>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────
export default function BCDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm p-8">Chargement…</div>}>
      <BCPageInner id={params.id} />
    </Suspense>
  );
}
