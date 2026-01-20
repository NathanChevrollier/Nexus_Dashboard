import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type Body = {
  type?: string;
  subject?: string;
  message?: string;
  email?: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json().catch(() => ({} as Body));

    const { subject, message, type, email } = body || {};

    if (!subject || !message) {
      return NextResponse.json({ error: "Sujet et message requis" }, { status: 400 });
    }

    // Récupérer session si disponible pour inclure l'utilisateur
    let userInfo = { id: null, name: null } as any;
    try {
      const session = await auth();
      if (session && session.user) {
        userInfo.id = session.user.id;
        userInfo.name = session.user.name || session.user.email || null;
      }
    } catch (err) {
      // ignore if no session
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK;
    // For debugging: mask webhook url when logging to avoid leaking secrets
    const maskedWebhook = webhookUrl ? `${webhookUrl.slice(0, 40)}...` : null;
    console.log('[contact] webhook configured:', !!webhookUrl);

    // Préparer un contenu lisible pour DM fallback
    const userLabel = userInfo.name ? `${userInfo.name} (${userInfo.id})` : "Anonyme";
    const safeMessage = (message || "").toString();
    const content = `Type: ${type || "feedback"}\nSujet: ${subject}\nEmail: ${email || "N/A"}\nUtilisateur: ${userLabel}\n\n${safeMessage}`.slice(0, 1900);

    // Si un token de bot et l'ID du propriétaire sont fournis, tenter d'envoyer en DM
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const ownerId = process.env.DISCORD_OWNER_ID || process.env.DISCORD_OWNER;

    if (botToken && ownerId) {
      try {
        // Créer ou récupérer le canal DM
        const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
          method: "POST",
          headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ recipient_id: ownerId }),
        });

        if (dmRes.ok) {
          const dmJson = await dmRes.json();
          const channelId = dmJson.id;
          const sendRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: "POST",
            headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          });

          if (sendRes.ok) {
            return NextResponse.json({ message: "Message envoyé (DM)" });
          }
        }
      } catch (err) {
        console.warn("Envoi DM échoué, fallback webhook", err);
        // continue to webhook fallback
      }
    }

    // Fallback: envoyer au webhook si configuré
    if (!webhookUrl) {
      return NextResponse.json({ error: "Aucun moyen d'envoyer le message (webhook ou bot non configuré)" }, { status: 500 });
    }

    const embed = {
      title: `${type === 'bug' ? 'Signalement de bug' : 'Nouveau feedback'}: ${subject}`,
      description: safeMessage.substring(0, 2000),
      color: 5814783,
      fields: [
        { name: "Type", value: type || "feedback", inline: true },
        { name: "Email", value: email || "N/A", inline: true },
        { name: "Utilisateur", value: userLabel, inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    const payload = { embeds: [embed] };

    try {
      const res = await fetch(webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error('[contact] webhook send failed', { status: res.status, body: text, webhook: maskedWebhook });

        // Discord forum webhooks require a thread_name or thread_id when posting to forum channels
        // If we detect that specific error, retry by including a thread_name derived from the subject.
        try {
          const bodyText = text || "";
          let parsed: any = null;
          try { parsed = JSON.parse(bodyText); } catch (e) { /* not JSON */ }

          const isForumError =
            bodyText.includes("thread_name") ||
            bodyText.includes("thread_id") ||
            parsed?.code === 220001;

          if (isForumError) {
            const threadName = (subject || "message").toString().slice(0, 100);
            const forumPayload = { ...payload, thread_name: threadName };

            const retry = await fetch(webhookUrl!, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(forumPayload),
            });

            if (retry.ok) {
              console.log('[contact] webhook retry succeeded (forum)');
              return NextResponse.json({ message: "Message envoyé (webhook, forum thread)" });
            }
            const retryText = await retry.text().catch(() => "");
            console.error('[contact] webhook retry failed', { status: retry.status, body: retryText, webhook: maskedWebhook });
          }
        } catch (e) {
          console.error('[contact] webhook retry error', e);
        }

        return NextResponse.json({ error: `Erreur webhook: ${res.status} ${text}` }, { status: 500 });
      }

      console.log('[contact] webhook send ok', { webhook: maskedWebhook });
      return NextResponse.json({ message: "Message envoyé (webhook)" });
    } catch (err) {
      console.error('[contact] webhook fetch error', err, { webhook: maskedWebhook });
      return NextResponse.json({ error: `Erreur webhook: ${String(err)}` }, { status: 500 });
    }
  } catch (err) {
    console.error("Contact API error", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
