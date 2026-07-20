import Link from 'next/link';
import NewBCForm from './NewBCForm';
import { MOCK_INTERVENTIONS } from '@/lib/interventionData';
import type { DemandeOption } from './NewBCForm';

const MOCK_SUPPLIERS = [
  { id: 'sup-1', name: 'Elkateb Electricité',  contact: 'M. Adnen Elkateb',    phone: '+216 71 234 567', email: 'contact@elkateb.tn'       },
  { id: 'sup-2', name: 'Tunisie Électrique',    contact: 'M. Kamel Ben Ali',     phone: '+216 70 123 456', email: 'vente@tunisie-elec.tn'    },
  { id: 'sup-3', name: 'STEG Matériaux',        contact: 'Mme. Sana Trabelsi',   phone: '+216 71 345 678', email: 'steg-mat@steg.com.tn'     },
  { id: 'sup-4', name: 'Maghreb Electric',       contact: 'M. Hichem Mansouri',   phone: '+216 70 456 789', email: 'info@maghreb-electric.tn' },
  { id: 'sup-5', name: 'Techno Hydraulique',     contact: 'M. Sami Mrad',         phone: '+216 73 456 789', email: 'sami.mrad@techno-hyd.tn'  },
];

interface Props {
  searchParams: { request_id?: string };
}

export default function NewBCPage({ searchParams }: Props) {
  const initialRequestId = searchParams.request_id ?? '';

  // Demandes en préparation — en prod: filtrées par l'entité et les assignations de l'utilisateur courant
  const demandesEnPrep: DemandeOption[] = MOCK_INTERVENTIONS
    .filter(i => i.status === 'en_preparation')
    .map(i => ({
      id:       i.id,
      ref:      i.ref,
      title:    i.title,
      site:     i.site,
      entity:   i.entity,
      category: i.category,
    }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/demandes" className="hover:text-slate-900 transition-colors">Demandes</Link>
        <span>/</span>
        {initialRequestId && (
          <>
            <Link href={`/demandes/${initialRequestId}`} className="hover:text-slate-900 transition-colors">#{initialRequestId}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-900 font-medium">Nouveau Bon de Commande</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau Bon de Commande</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Sélectionnez une demande en préparation, choisissez un fournisseur et joignez les devis comparatifs.
        </p>
      </div>

      <NewBCForm
        initialRequestId={initialRequestId}
        demandesEnPrep={demandesEnPrep}
        suppliers={MOCK_SUPPLIERS}
        electricianName="Mohamed Salah"
      />
    </div>
  );
}
