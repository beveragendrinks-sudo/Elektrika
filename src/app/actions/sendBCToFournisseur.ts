'use server';

import { supabase } from '@/lib/supabase';
import { emailBCSentToFournisseur } from '@/lib/emailTemplates';

export async function sendBCToFournisseurAction(params: {
  poNumber: string;
  requestTitle: string;
  contactName: string;
  entityName: string;
  requestId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const email = emailBCSentToFournisseur(
      params.poNumber,
      params.requestTitle,
      params.contactName,
      params.entityName,
    );

    await supabase.from('notifications').insert({
      request_id: params.requestId ?? null,
      level: 'low',
      recipient_user_id: null,
      channel: 'email',
      message: `BC ${params.poNumber} envoyé au fournisseur ${params.contactName} (${params.entityName}).`,
      email_subject: email.subject,
      email_html: email.html,
      status_at_trigger: 'sent',
      hours_in_status: 0,
    });

    return { ok: true };
  } catch (err) {
    console.error('[sendBCToFournisseur]', err);
    return { ok: false, error: String(err) };
  }
}
