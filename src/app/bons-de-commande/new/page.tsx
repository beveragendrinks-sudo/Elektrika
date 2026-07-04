import Link from 'next/link';
import NewBCForm from './NewBCForm';

// Mock demande data — sera remplacé par fetch Supabase
const MOCK_DEMANDES: Record<string, { title: string; site: string; type: string; entity: string; status: string }> = {
  '1': { title: 'Panne tableau TGS-B2', site: 'Siège Ben Arous', type: 'Panne simple', entity: 'LAD', status: 'Clarification en cours' },
  '4': { title: 'Disjoncteur Atelier C', site: 'Pôle Industriel Jbel Oust', type: 'Panne simple', entity: 'LAD', status: 'Planifiée' },
  '5': { title: 'Remplacement variateur V-08', site: 'Megrine', type: 'Réparation avec matériel', entity: 'LAD', status: 'Préparation' },
};

const MOCK_SUPPLIERS = [
  { id: 'sup-1', name: 'Elkateb Electricité', contact: 'M. Adnen Elkateb', phone: '+216 71 234 567', email: 'contact@elkateb.tn' },
  { id: 'sup-2', name: 'Tunisie Électrique', contact: 'M. Kamel Ben Ali', phone: '+216 70 123 456', email: 'vente@tunisie-elec.tn' },
  { id: 'sup-3', name: 'STEG Matériaux', contact: 'Mme. Sana Trabelsi', phone: '+216 71 345 678', email: 'steg-mat@steg.com.tn' },
  { id: 'sup-4', name: 'Maghreb Electric', contact: 'M. Hichem Mansouri', phone: '+216 70 456 789', email: 'info@maghreb-electric.tn' },
];

interface Props {
  searchParams: { request_id?: string };
}

export default function NewBCPage({ searchParams }: Props) {
  const requestId = searchParams.request_id ?? '';
  const demande = MOCK_DEMANDES[requestId] ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/demandes" className="hover:text-slate-900 transition-colors">Demandes</Link>
        <span>/</span>
        {requestId && (
          <>
            <Link href={`/demandes/${requestId}`} className="hover:text-slate-900 transition-colors">#{requestId}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-slate-900 font-medium">Nouveau Bon de Commande</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nouveau Bon de Commande</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Créez un BC pour commander les matériaux ou prestations nécessaires à cette intervention.
        </p>
      </div>

      <NewBCForm
        requestId={requestId}
        demande={demande}
        suppliers={MOCK_SUPPLIERS}
        electricianName="Mohamed Salah"
        entity="LAD"
      />
    </div>
  );
}
