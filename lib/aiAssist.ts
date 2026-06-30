// ============================================================
// LOT — Intégration IA (Claude / Anthropic API)
// Usage strictement ciblé : pré-remplissage de champs, jamais
// une interface conversationnelle. L'électricien valide toujours
// la suggestion avant qu'elle ne soit enregistrée définitivement.
// ============================================================

/**
 * Usage 1 — Analyse des photos envoyées en statut "clarification"
 * Entrée : photos (base64) prises sur place ou reçues par WhatsApp
 * Sortie : diagnostic structuré + liste de matériel suggérée
 *
 * Champs DB concernés : ai_diagnosis_suggestion, ai_suggested_materials, ai_confidence
 */

export interface AIPhotoAnalysisInput {
  images: { base64: string; mediaType: 'image/jpeg' | 'image/png' }[];
  equipmentName: string;
  equipmentCriticality: number;
  freeTextContext?: string; // ce que l'électricien a compris pendant l'appel
}

export interface AIPhotoAnalysisResult {
  diagnosis: string;
  suggestedMaterials: { description: string; estimated_quantity: number; unit?: string }[];
  estimatedInterventionType: 1 | 2 | 3 | null; // suggestion, l'électricien tranche
  confidence: number; // 0–1
  requiresExternalContractor: boolean;
  raw: string; // réponse brute, pour audit
}

const ANALYSIS_SYSTEM_PROMPT = `Tu es un assistant de diagnostic électrique industriel.
On te fournit des photos d'une panne électrique et le contexte recueilli par téléphone.
Réponds UNIQUEMENT en JSON, sans aucun texte avant ou après, avec ce format exact :
{
  "diagnosis": "description claire et concise du problème observé",
  "suggested_materials": [{"description": "...", "estimated_quantity": 1, "unit": "pièce"}],
  "estimated_intervention_type": 1,
  "confidence": 0.75,
  "requires_external_contractor": false
}
Si les photos ne permettent pas de conclure, mets confidence en dessous de 0.4 et explique
la limite dans "diagnosis". Ne jamais inventer une référence de pièce précise que tu ne peux
pas lire sur la photo — reste générique dans ce cas ("disjoncteur 32A type non lisible").`;

export async function analyzeElectricalFault(
  input: AIPhotoAnalysisInput
): Promise<AIPhotoAnalysisResult> {
  const content: any[] = [
    {
      type: 'text',
      text: `Équipement : ${input.equipmentName} (criticité ${input.equipmentCriticality}/5).
Contexte recueilli par l'électricien : ${input.freeTextContext ?? 'aucun'}.
Analyse les photos ci-jointes et réponds au format JSON demandé.`,
    },
    ...input.images.map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
    })),
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  const data = await response.json();
  const rawText: string = data.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');

  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      diagnosis: parsed.diagnosis,
      suggestedMaterials: parsed.suggested_materials ?? [],
      estimatedInterventionType: parsed.estimated_intervention_type ?? null,
      confidence: parsed.confidence ?? 0,
      requiresExternalContractor: parsed.requires_external_contractor ?? false,
      raw: rawText,
    };
  } catch {
    // En cas de réponse non parsable : ne jamais bloquer le workflow,
    // l'électricien continue manuellement.
    return {
      diagnosis: "Analyse IA indisponible — saisie manuelle requise.",
      suggestedMaterials: [],
      estimatedInterventionType: null,
      confidence: 0,
      requiresExternalContractor: false,
      raw: rawText,
    };
  }
}

/**
 * Usage 2 — Structuration des notes brutes de l'électricien en description
 * propre pour le rapport final (statut completed_pending_confirmation).
 */
export interface AINoteStructuringInput {
  rawNotes: string;
  equipmentName: string;
}

export async function structureInterventionReport(
  input: AINoteStructuringInput
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `Tu reformules des notes brutes d'électricien industriel en un rapport
d'intervention clair, professionnel, 3-5 phrases maximum. Réponds uniquement avec
le texte du rapport, sans préambule ni formatage Markdown.`,
      messages: [
        {
          role: 'user',
          content: `Équipement : ${input.equipmentName}\nNotes brutes : ${input.rawNotes}`,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();
}

/**
 * Règle d'usage produit (à respecter dans l'UI) :
 * - L'IA ne remplit JAMAIS un champ silencieusement. Elle propose, affichée
 *   dans un encart distinct ("Suggestion IA — à valider") avec le niveau de
 *   confiance visible.
 * - L'électricien clique "Accepter" (copie la suggestion dans les champs réels)
 *   ou "Ignorer". Aucune écriture en base sans validation humaine.
 * - confidence < 0.5 : afficher un avertissement visuel, ne pas pré-cocher
 *   l'acceptation.
 */
