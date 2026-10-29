import type { Metadata } from "next";
import { db } from "@/lib/db";
import { checkUnsubscribe } from "@/lib/mail-flow";
import { unsubscribe } from "./actions";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false } };

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { token } = await params;
  const { ok } = await searchParams;
  const id = checkUnsubscribe(decodeURIComponent(token));
  const p = id ? await db.prospect.findUnique({ where: { id }, select: { optOutAt: true, organization: { select: { name: true } } } }) : null;
  return (
    <main className="unsub">
      <div className="panel stack">
        {!p ? (
          <><h1>Lien invalide</h1><p className="muted">Ce lien de désinscription n&apos;est pas reconnu. Répondez simplement à l&apos;email reçu pour demander à ne plus être contacté.</p></>
        ) : ok || p.optOutAt ? (
          <><h1>C&apos;est noté</h1><p className="muted">Vous ne recevrez plus de messages de {p.organization.name}.</p></>
        ) : (
          <>
            <h1>Ne plus recevoir de messages</h1>
            <p className="muted">Confirmez pour ne plus recevoir d&apos;emails de {p.organization.name}.</p>
            <form action={unsubscribe}>
              <input type="hidden" name="token" value={decodeURIComponent(token)} />
              <button className="btn primary" type="submit">Confirmer ma désinscription</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
