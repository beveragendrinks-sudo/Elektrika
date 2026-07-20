import { NextRequest, NextResponse } from 'next/server';
import { sendTelegram } from '@/lib/telegram';

// ── Liaison chat_id ↔ utilisateur ─────────────────────────────────────────────
// POST /api/telegram/link
// Body : { userId: string, chatId: string }
//
// Vérifie que le chat_id est valide en envoyant un message de confirmation,
// puis stocke l'association en BDD (Supabase en prod, log en dev).
//
// DELETE /api/telegram/link
// Body : { userId: string }
// Supprime le chat_id du profil utilisateur.

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { userId?: string; chatId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, chatId } = body;
  if (!userId || !chatId) {
    return NextResponse.json({ error: 'userId et chatId requis' }, { status: 422 });
  }

  // Vérification : envoyer un message test au chat_id fourni
  const ok = await sendTelegram(chatId, [
    `✅ <b>Compte lié avec succès !</b>`,
    '',
    `Vous recevrez désormais les notifications Facility Manager directement ici.`,
    `Pour désactiver, supprimez votre Chat ID depuis votre profil.`,
  ].join('\n'));

  if (!ok) {
    return NextResponse.json(
      { error: 'Chat ID invalide ou bot non démarré — tapez /start dans le bot d\'abord' },
      { status: 400 },
    );
  }

  // En production : persister dans Supabase
  // await supabase.from('users').update({ telegram_chat_id: chatId }).eq('id', userId)
  console.log(`[Telegram] Liaison ${userId} ↔ chat_id ${chatId}`);

  return NextResponse.json({ ok: true, chatId });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: { userId?: string; chatId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, chatId } = body;
  if (!userId) {
    return NextResponse.json({ error: 'userId requis' }, { status: 422 });
  }

  // Envoyer un message de confirmation de désabonnement
  if (chatId) {
    await sendTelegram(chatId, `🔕 Notifications Telegram désactivées pour votre compte.`);
  }

  // En production : supabase.from('users').update({ telegram_chat_id: null }).eq('id', userId)
  console.log(`[Telegram] Déliaison ${userId}`);

  return NextResponse.json({ ok: true });
}
