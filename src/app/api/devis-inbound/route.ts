import { NextRequest, NextResponse } from 'next/server';

// ── Webhook inbound devis ─────────────────────────────────────────────────────
// Supporte Mailgun et Postmark.
//
// Configuration :
//   Mailgun  → Store & Forward route : filtre `match_header("subject", "DEM-")`,
//              action `forward("https://votre-app.com/api/devis-inbound")`
//   Postmark → Inbound webhook URL : https://votre-app.com/api/devis-inbound
//
// Sujet attendu : "Devis - DEM-2026-048" ou "RE: DEM-2026-048 - Demande de devis"
//
// En production : remplacer les console.log par des insertions Supabase.

const INTERVENTION_REF_REGEX = /DEM-\d{4}-\d{3,6}/i;
const BC_REF_REGEX            = /BC-[A-Z]+-\d{4}-\d{6}/i;

interface ParsedDevis {
  type:              'intervention' | 'bc' | 'unknown';
  ref:               string | null;
  fromEmail:         string;
  fromName:          string;
  subject:           string;
  bodyText:          string;
  attachments:       ParsedAttachment[];
  receivedAt:        string;
  provider:          'mailgun' | 'postmark' | 'unknown';
}

interface ParsedAttachment {
  filename: string;
  contentType: string;
  size: number;
  url?: string;  // Mailgun fournit une URL temporaire
}

// ── Mailgun payload ───────────────────────────────────────────────────────────
// Mailgun envoie un multipart/form-data avec les champs :
// - sender, from, subject, body-plain, body-html, attachment-count, attachment-1...N
async function parseMailgun(req: NextRequest): Promise<ParsedDevis> {
  const form = await req.formData();

  const fromRaw   = form.get('from')?.toString()       ?? '';
  const subject   = form.get('subject')?.toString()    ?? '';
  const bodyText  = form.get('body-plain')?.toString() ?? '';
  const count     = parseInt(form.get('attachment-count')?.toString() ?? '0', 10);

  const emailMatch = fromRaw.match(/<(.+?)>/);
  const fromEmail  = emailMatch?.[1] ?? fromRaw;
  const fromName   = fromRaw.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '');

  const attachments: ParsedAttachment[] = [];
  for (let i = 1; i <= count; i++) {
    const file = form.get(`attachment-${i}`) as File | null;
    if (file) {
      attachments.push({
        filename:    file.name,
        contentType: file.type,
        size:        file.size,
      });
    }
    // Mailgun aussi fournit attachment-url-N (lien de téléchargement temporaire)
    const url = form.get(`attachment-url-${i}`)?.toString();
    if (url && attachments[i - 1]) attachments[i - 1].url = url;
  }

  const ref = extractRef(subject);
  return { type: ref?.type ?? 'unknown', ref: ref?.value ?? null, fromEmail, fromName, subject, bodyText, attachments, receivedAt: new Date().toISOString(), provider: 'mailgun' };
}

// ── Postmark payload ──────────────────────────────────────────────────────────
// Postmark envoie du JSON avec : From, Subject, TextBody, Attachments[]
async function parsePostmark(body: Record<string, unknown>): Promise<ParsedDevis> {
  const fromRaw   = String(body.From    ?? '');
  const subject   = String(body.Subject ?? '');
  const bodyText  = String(body.TextBody ?? '');

  const emailMatch = fromRaw.match(/<(.+?)>/);
  const fromEmail  = emailMatch?.[1] ?? fromRaw;
  const fromName   = fromRaw.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '');

  const rawAttachments = (body.Attachments as Array<{ Name: string; ContentType: string; ContentLength: number }> | undefined) ?? [];
  const attachments: ParsedAttachment[] = rawAttachments.map(a => ({
    filename:    a.Name,
    contentType: a.ContentType,
    size:        a.ContentLength,
  }));

  const ref = extractRef(subject);
  return { type: ref?.type ?? 'unknown', ref: ref?.value ?? null, fromEmail, fromName, subject, bodyText, attachments, receivedAt: new Date().toISOString(), provider: 'postmark' };
}

// ── Ref extraction ────────────────────────────────────────────────────────────
function extractRef(subject: string): { type: 'intervention' | 'bc'; value: string } | null {
  const dem = subject.match(INTERVENTION_REF_REGEX);
  if (dem) return { type: 'intervention', value: dem[0].toUpperCase() };
  const bc = subject.match(BC_REF_REGEX);
  if (bc)  return { type: 'bc', value: bc[0].toUpperCase() };
  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    let parsed: ParsedDevis;

    if (contentType.includes('multipart/form-data')) {
      // Mailgun
      parsed = await parseMailgun(req);
    } else if (contentType.includes('application/json')) {
      // Postmark
      const body = await req.json() as Record<string, unknown>;
      parsed = await parsePostmark(body);
    } else {
      return NextResponse.json({ error: 'Unsupported content-type' }, { status: 415 });
    }

    // ── Validation ─────────────────────────────────────────────────────────
    if (!parsed.ref) {
      console.warn('[devis-inbound] Ref introuvable dans le sujet:', parsed.subject);
      // On accepte quand même (200) pour ne pas que le provider re-tente indéfiniment
      return NextResponse.json({ status: 'ignored', reason: 'no_ref_in_subject', subject: parsed.subject });
    }

    if (parsed.attachments.length === 0) {
      console.warn('[devis-inbound] Aucune pièce jointe reçue de', parsed.fromEmail);
      return NextResponse.json({ status: 'ignored', reason: 'no_attachment' });
    }

    // ── Log (en prod : persister dans Supabase) ────────────────────────────
    console.log('[devis-inbound] Devis reçu :', {
      provider:    parsed.provider,
      from:        `${parsed.fromName} <${parsed.fromEmail}>`,
      ref:         parsed.ref,
      type:        parsed.type,
      subject:     parsed.subject,
      attachments: parsed.attachments.map(a => `${a.filename} (${a.contentType}, ${a.size}o)`),
      receivedAt:  parsed.receivedAt,
    });

    // ── Logique en production ──────────────────────────────────────────────
    // 1. Trouver le QuoteRequest correspondant :
    //    SELECT * FROM quote_requests
    //    WHERE (intervention_ref = $ref OR bc_number = $ref)
    //      AND vendor_email = $fromEmail
    //      AND status = 'sent'
    //    LIMIT 1
    //
    // 2. Uploader la pièce jointe dans Supabase Storage :
    //    supabase.storage.from('devis').upload(`${ref}/${filename}`, fileBuffer)
    //
    // 3. Mettre à jour le QuoteRequest :
    //    supabase.from('quote_requests').update({
    //      status: 'received',
    //      received_at: parsedDevis.receivedAt,
    //      file_url: publicUrl,
    //      file_source: 'email',
    //    }).eq('id', quoteRequest.id)
    //
    // 4. Notifier le directeur si ≥2 devis reçus pour cette intervention.

    return NextResponse.json({
      status:      'ok',
      ref:         parsed.ref,
      type:        parsed.type,
      from:        parsed.fromEmail,
      attachments: parsed.attachments.length,
    });

  } catch (err) {
    console.error('[devis-inbound] Erreur:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Mailgun vérifie la route avec un GET
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', endpoint: 'devis-inbound' });
}
