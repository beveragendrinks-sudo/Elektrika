// ── Telegram Bot Notifications ────────────────────────────────────────────────
// Variables d'environnement requises :
//   TELEGRAM_BOT_TOKEN=7xxxxxxxxx:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
// Setup utilisateur :
//   1. L'utilisateur ouvre @ElektrikaFM_bot et tape /start
//   2. Le bot répond avec son chat_id
//   3. L'admin entre ce chat_id dans le profil utilisateur (Paramètres → Utilisateurs)
//
// En production : remplacer les mock chat_ids par des lectures Supabase

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const API_BASE  = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ── Envoi bas niveau ──────────────────────────────────────────────────────────
export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN non configuré — message ignoré');
    return false;
  }
  try {
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('[Telegram] Erreur envoi:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Telegram] Erreur réseau:', err);
    return false;
  }
}

// Envoie à plusieurs destinataires, ignore les chat_ids vides/null
export async function sendTelegramMulti(chatIds: (string | null | undefined)[], text: string): Promise<void> {
  const valid = chatIds.filter(Boolean) as string[];
  await Promise.all(valid.map(id => sendTelegram(id, text)));
}

// ── Formatters de messages ────────────────────────────────────────────────────
export const tg = {
  devisRecu(ref: string, vendorName: string, montant: number): string {
    return `📋 <b>Devis reçu</b>\n<code>${ref}</code>\n${vendorName} : <b>${montant.toLocaleString('fr-TN')} TND</b>\n→ Voir l'appel d'offres dans l'app`;
  },

  escaladeSLA(ref: string, titre: string, heures: number, statut: string): string {
    return `🔴 <b>Escalade SLA</b>\n<code>${ref}</code> — ${titre}\nStatut : ${statut} depuis <b>${heures}h</b>\n⚠ Seuil dépassé — action requise`;
  },

  rappelPrestataire(ref: string, titre: string, heures: number): string {
    return `⏰ <b>Rappel prestataire</b>\n<code>${ref}</code> — ${titre}\nAucune mise à jour depuis <b>${heures}h</b>\nMerci de mettre à jour le statut de l'intervention`;
  },

  bcAValider(bcNumber: string, montant: number, fournisseur: string): string {
    return `📦 <b>Bon de commande à valider</b>\n<code>${bcNumber}</code>\n${fournisseur} — <b>${montant.toLocaleString('fr-TN')} TND</b>\n→ Validation requise dans l'app`;
  },

  confirmationRequise(ref: string, titre: string): string {
    return `✅ <b>Confirmation travaux requise</b>\n<code>${ref}</code>\n${titre}\n→ Merci de confirmer la bonne réception des travaux`;
  },

  missionPlanifiee(ref: string, titre: string, date: string): string {
    return `📅 <b>Nouvelle mission planifiée</b>\n<code>${ref}</code> — ${titre}\nDate : <b>${date}</b>\n→ Voir votre planning dans l'app`;
  },

  demandeAcceptee(ref: string, titre: string, date: string): string {
    return `🔧 <b>Intervention planifiée</b>\n<code>${ref}</code>\n${titre}\nDate prévue : <b>${date}</b>`;
  },

  bcValide(bcNumber: string, montant: number): string {
    return `✅ <b>BC validé</b>\n<code>${bcNumber}</code>\nMontant : <b>${montant.toLocaleString('fr-TN')} TND</b>\nLe bon de commande a été approuvé`;
  },

  nouveauDevisAttendu(ref: string, vendorCount: number): string {
    return `📨 <b>Appel d'offres lancé</b>\n<code>${ref}</code>\n${vendorCount} prestataire${vendorCount > 1 ? 's' : ''} sollicité${vendorCount > 1 ? 's' : ''}\n→ En attente des devis`;
  },
};

// ── Utilitaire bot ────────────────────────────────────────────────────────────
// Récupère les dernières mises à jour du bot (pour getUpdates en mode polling)
export async function getBotUpdates(offset?: number): Promise<TelegramUpdate[]> {
  if (!BOT_TOKEN) return [];
  try {
    const url = `${API_BASE}/getUpdates${offset ? `?offset=${offset}` : ''}`;
    const res  = await fetch(url);
    const data = await res.json() as { ok: boolean; result: TelegramUpdate[] };
    return data.ok ? data.result : [];
  } catch {
    return [];
  }
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string; first_name: string };
    chat: { id: number };
    text?: string;
    date: number;
  };
}
