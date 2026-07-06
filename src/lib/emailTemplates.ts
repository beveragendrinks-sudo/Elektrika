/**
 * Email template engine — Facility Manager / Groupe Elkateb
 *
 * Usage: buildEmail(opts) returns { subject, html, text }.
 * Wire html/text to your email provider (Resend, SendGrid, SMTP…).
 *
 * APP_URL must be set in environment:
 *   NEXT_PUBLIC_APP_URL=https://your-domain.com
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

interface EmailOpts {
  subject: string;
  title: string;
  body: string;               // plain text, may contain \n for line breaks
  ctaLabel?: string;          // button text (default: "Ouvrir l'application")
  ctaPath?: string;           // relative path e.g. '/demandes/abc' or '/dashboard/demandeur'
  footerNote?: string;
}

export interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

export function buildEmail(opts: EmailOpts): EmailPayload {
  const ctaUrl   = opts.ctaPath ? `${APP_URL}${opts.ctaPath}` : APP_URL;
  const ctaLabel = opts.ctaLabel ?? "Ouvrir l'application";
  const bodyHtml = opts.body.replace(/\n/g, '<br />');
  const footer   = opts.footerNote
    ?? 'Vous recevez cet e-mail car vous êtes inscrit dans le système Facility Manager du Groupe Elkateb.';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${opts.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:600px;width:100%;">

        <!-- En-tête -->
        <tr>
          <td style="background:#0f172a;padding:20px 32px;">
            <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">&#127970; Facility Manager</p>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">
              Service Maintenance des Infrastructures multi-sites du Groupe Elkateb
            </p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">${opts.title}</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">${bodyHtml}</p>

            <!-- Bouton CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#0f172a;border-radius:8px;">
                  <a href="${ctaUrl}"
                    style="display:block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;">
                    ${ctaLabel}
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br />
              <a href="${ctaUrl}" style="color:#3b82f6;word-break:break-all;">${ctaUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Pied de page -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">${footer}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    opts.title,
    '',
    opts.body,
    '',
    `${ctaLabel} : ${ctaUrl}`,
    '',
    '---',
    'Facility Manager — Groupe Elkateb',
    footer,
  ].join('\n');

  return { subject: opts.subject, html, text };
}

// ── Templates prêts à l'emploi ────────────────────────────────────────────────

export function emailMissionPlanifiee(missionDate: string): EmailPayload {
  return buildEmail({
    subject: `Facility Manager — Nouvelle mission planifiée pour le ${missionDate}`,
    title: 'Nouvelle mission planifiée',
    body: `Une nouvelle mission vous a été assignée pour le ${missionDate}.\nConsultez les détails et téléchargez votre Ordre de Travail depuis l'application.`,
    ctaLabel: 'Voir mes missions',
    ctaPath: '/dashboard/electricien',
  });
}

export function emailDemandePlanifiee(missionDate: string): EmailPayload {
  return buildEmail({
    subject: 'Facility Manager — Votre demande a été planifiée',
    title: 'Votre intervention est planifiée',
    body: `Votre demande de maintenance a été prise en charge.\nL'intervention est prévue le ${missionDate}.\nVous pouvez suivre l'avancement en temps réel depuis votre espace.`,
    ctaLabel: "Suivre mon intervention",
    ctaPath: '/dashboard/demandeur',
  });
}

export function emailConfirmationRequise(demandeRef: string): EmailPayload {
  return buildEmail({
    subject: `Facility Manager — Confirmation requise : ${demandeRef}`,
    title: 'Votre confirmation est requise',
    body: `L'intervention pour votre demande ${demandeRef} est terminée.\nMerci de confirmer la clôture ou de signaler un problème depuis votre espace demandeur.`,
    ctaLabel: "Confirmer l'intervention",
    ctaPath: '/dashboard/demandeur',
    footerNote: 'Votre confirmation est nécessaire pour clôturer définitivement l\'intervention. Sans réponse sous 48h, la demande sera automatiquement acceptée.',
  });
}

export function emailEscaladeDG(demandeRef: string, hoursElapsed: number): EmailPayload {
  return buildEmail({
    subject: `Facility Manager — Escalade DG : demande ${demandeRef} non traitée`,
    title: 'Escalade — Action requise',
    body: `La demande ${demandeRef} est en attente depuis ${hoursElapsed} heures sans traitement.\nUne intervention de votre part est nécessaire.\nConsultez le tableau de bord Direction Générale pour les détails.`,
    ctaLabel: 'Tableau de bord DG',
    ctaPath: '/dashboard/dg',
  });
}

export function emailEscaladeDirecteur(demandeRef: string, hoursElapsed: number): EmailPayload {
  return buildEmail({
    subject: `Facility Manager — Escalade : demande ${demandeRef} en attente`,
    title: 'Escalade — Demande non traitée',
    body: `La demande ${demandeRef} est en attente depuis ${hoursElapsed} heures.\nMerci de vérifier son statut et d'assigner un prestataire si nécessaire.`,
    ctaLabel: 'Voir les demandes',
    ctaPath: '/demandes',
  });
}

export function emailBCValidationRequise(poNumber: string, bcId: string): EmailPayload {
  return buildEmail({
    subject: `Facility Manager — Bon de commande ${poNumber} à valider`,
    title: 'Bon de commande en attente de validation',
    body: `Le bon de commande ${poNumber} est en attente de votre approbation.\nConsultez le détail, vérifiez les lignes et validez ou rejetez depuis l'application.`,
    ctaLabel: 'Valider le bon de commande',
    ctaPath: `/bons-de-commande/${bcId}`,
  });
}

export function emailBCSentToFournisseur(
  poNumber: string,
  requestTitle: string,
  contactName: string,
  entityName: string
): EmailPayload {
  return buildEmail({
    subject: `Bon de commande ${poNumber} — ${entityName}`,
    title: `Bon de commande ${poNumber}`,
    body: `Bonjour ${contactName},\n\nNous avons le plaisir de vous adresser le bon de commande ${poNumber} concernant l'intervention suivante :\n« ${requestTitle} »\n\nMerci de confirmer la réception de cette commande et de nous communiquer le délai de livraison prévu.\n\nCordialement,\nService Maintenance — ${entityName} / Groupe Elkateb`,
    ctaLabel: "Accéder à l'application",
    ctaPath: '/bons-de-commande',
    footerNote: `Ce bon de commande a été émis et validé par ${entityName}. Pour toute question, contactez le responsable maintenance.`,
  });
}

export function emailRappelPrestataire(demandeRef: string, hoursElapsed: number): EmailPayload {
  return buildEmail({
    subject: `Facility Manager — Rappel : demande ${demandeRef} en attente`,
    title: 'Rappel — Intervention non démarrée',
    body: `La demande ${demandeRef} vous a été assignée et est en attente depuis ${hoursElapsed} heures.\nMerci de consulter votre planning et de démarrer l'intervention.`,
    ctaLabel: 'Voir mon planning',
    ctaPath: '/dashboard/electricien',
  });
}
