import NewDemandeForm from './NewDemandeForm';
import { supabase } from '@/lib/supabase';
import { getAllSites } from '@/lib/entities';

const FALLBACK_SITES = getAllSites().map(s => ({
  intervention_site_id: s.id,
  label: `${s.label}, ${s.city}${s.entityCodes.length ? ' (' + s.entityCodes.join(', ') + ')' : ''}`,
}));

const FALLBACK_ENTITIES = [
  { entity_id: 'ent-1', code: 'LAD',    name: 'LAD'    },
  { entity_id: 'ent-2', code: 'FAD',    name: 'FAD'    },
  { entity_id: 'ent-3', code: 'BTFI',   name: 'BTFI'   },
  { entity_id: 'ent-4', code: '3Ps',    name: '3Ps'    },
  { entity_id: 'ent-5', code: 'K&Ko',   name: 'K&Ko'   },
  { entity_id: 'ent-6', code: 'Privée', name: 'Privée' },
];

async function getFormData() {
  try {
    const [sitesRes, entitiesRes] = await Promise.all([
      supabase.from('intervention_sites').select('intervention_site_id, label').eq('active', true).order('sort_order'),
      supabase.from('group_entities').select('entity_id, code, name').eq('active', true),
    ]);
    return {
      sites:    sitesRes.data?.length    ? sitesRes.data    : FALLBACK_SITES,
      entities: entitiesRes.data?.length ? entitiesRes.data : FALLBACK_ENTITIES,
    };
  } catch {
    return { sites: FALLBACK_SITES, entities: FALLBACK_ENTITIES };
  }
}

interface Props {
  searchParams: { as?: string };
}

export default async function NewDemandePage({ searchParams }: Props) {
  const { sites, entities } = await getFormData();
  const userRole: 'demandeur' | 'prestataire' =
    searchParams.as === 'prestataire' ? 'prestataire' : 'demandeur';

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Nouvelle demande d&apos;intervention</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {userRole === 'prestataire'
            ? "Signalez une anomalie ou panne constatée sur site. Le responsable d'entité sera notifié."
            : "Un prestataire de service qualifié sera assigné par votre responsable et vous contactera pour la clarification."}
        </p>
      </div>
      <NewDemandeForm
        interventionSites={sites}
        entities={entities}
        userRole={userRole}
      />
    </div>
  );
}
