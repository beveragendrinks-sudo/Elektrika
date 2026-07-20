import { NextRequest, NextResponse } from 'next/server';
import { sendTelegram, type TelegramUpdate } from '@/lib/telegram';

// ── Webhook Telegram Bot ───────────────────────────────────────────────────────
// À configurer dans BotFather → /setwebhook :
//   https://votre-app.vercel.app/api/telegram/webhook
//
// Le bot répond aux commandes :
//   /start   → envoie le chat_id à l'utilisateur pour qu'il le copie dans son profil
//   /chatid  → idem (alias pratique)
//   /stop    → confirmation de désabonnement
//
// En production : vérifier X-Telegram-Bot-Api-Secret-Token (header de sécurité)

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Vérification du secret Telegram (optionnel mais recommandé)
  if (SECRET) {
    const token = req.headers.get('x-telegram-bot-api-secret-token');
    if (token !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await req.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId   = String(msg.chat.id);
  const text     = msg.text.trim().toLowerCase();
  const fromName = msg.from.first_name;

  // Commandes /start et /chatid
  if (text === '/start' || text === '/chatid' || text.startsWith('/start ')) {
    const reply = [
      `👋 Bonjour ${fromName} !`,
      '',
      `Votre <b>Chat ID Telegram</b> est :`,
      `<code>${chatId}</code>`,
      '',
      `Copiez ce code et collez-le dans votre profil :`,
      `<b>Paramètres → Utilisateurs → Modifier → Chat ID Telegram</b>`,
      '',
      `Vous recevrez ensuite toutes les alertes et notifications directement ici.`,
    ].join('\n');
    await sendTelegram(chatId, reply);
  }

  // Commande /stop
  else if (text === '/stop') {
    const reply = [
      `🔕 Notifications désactivées.`,
      '',
      `Pour vous réabonner, revenez dans vos paramètres et saisissez à nouveau votre Chat ID.`,
    ].join('\n');
    await sendTelegram(chatId, reply);
    // En production : supprimer le chat_id du profil utilisateur dans Supabase
  }

  // Commande inconnue
  else if (text.startsWith('/')) {
    await sendTelegram(chatId, `Commandes disponibles :\n/start — obtenir votre Chat ID\n/chatid — obtenir votre Chat ID\n/stop — désactiver les notifications`);
  }

  return NextResponse.json({ ok: true });
}

// Telegram vérifie le webhook avec un GET
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', endpoint: 'telegram-webhook' });
}
