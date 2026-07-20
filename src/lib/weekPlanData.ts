export interface ValidatedBC {
  id: string;
  po: string;
}

export interface WeekMission {
  id: string;
  ot_id: string;
  title: string;
  site: string;
  type: 1 | 2 | 3;
  points: 1 | 3 | 5;
  validated_bcs?: ValidatedBC[];
}

export interface WeekDay {
  key: string;
  label: string;
  shortLabel: string;
  date: string;
  isToday?: boolean;
  isPast?: boolean;
  missions: WeekMission[];
}

export const TYPE_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Panne simple',
  2: 'Réparation',
  3: 'Travaux',
};

export const TYPE_COLOR: Record<1 | 2 | 3, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-violet-100 text-violet-700',
};

export const WEEK_PLAN: WeekDay[] = [
  {
    key: 'lun', label: 'Lundi', shortLabel: 'Lun', date: '14/07', isPast: true,
    missions: [
      { id: '3', ot_id: 'ot-3', title: 'Câblage armoire AT-04', site: 'Siège Ben Arous', type: 3, points: 5 },
      { id: '6', ot_id: 'ot-6', title: 'Vérif. disj. ligne D', site: 'Siège Ben Arous', type: 1, points: 1 },
    ],
  },
  {
    key: 'mar', label: 'Mardi', shortLabel: 'Mar', date: '15/07', isPast: true,
    missions: [
      { id: '1', ot_id: 'ot-1', title: 'Panne tableau TGS-B2', site: 'Siège Ben Arous', type: 1, points: 1 },
      { id: '2', ot_id: 'ot-2', title: 'Remplacement fusible armoire B3', site: 'Siège Ben Arous', type: 1, points: 1 },
    ],
  },
  {
    key: 'mer', label: 'Mercredi', shortLabel: 'Mer', date: '16/07', isToday: true,
    missions: [
      {
        id: '4', ot_id: 'ot-4', title: 'Disjoncteur Atelier C', site: 'Pôle Industriel Jbel Oust',
        type: 1, points: 1,
        validated_bcs: [{ id: 'bc-2', po: 'BC-LAD-2026-000038' }],
      },
      {
        id: '8', ot_id: 'ot-8', title: 'Vérification tableau BT', site: 'Pôle Industriel Jbel Oust',
        type: 2, points: 3,
        validated_bcs: [],
      },
    ],
  },
  {
    key: 'jeu', label: 'Jeudi', shortLabel: 'Jeu', date: '17/07',
    missions: [
      {
        id: '5', ot_id: 'ot-5', title: 'Remplacement variateur V-08', site: 'Megrine',
        type: 2, points: 3,
        validated_bcs: [{ id: 'bc-1', po: 'BC-LAD-2026-000041' }],
      },
    ],
  },
  {
    key: 'ven', label: 'Vendredi', shortLabel: 'Ven', date: '18/07',
    missions: [],
  },
];
