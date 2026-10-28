import { db } from "@/lib/db";
import { mailEnabled, PROVIDER_LABEL, type Provider } from "@/lib/mail";
import { SubmitButton } from "@/components/forms";
import { disconnectMail } from "../mail-actions";

const MSG: Record<string, [string, string]> = {
  ok: ["ok", "Boîte mail connectée."],
  erreur: ["error", "La connexion a échoué. Réessayez."],
  refuse: ["error", "Connexion annulée ou expirée. Réessayez."],
  indisponible: ["error", "Ce service n'est pas encore activé sur Cockpit'ch."],
};

export async function MailPanel({ userId, status }: { userId: string; status?: string }) {
  const account = await db.mailAccount.findUnique({ where: { userId } });
  const msg = status ? MSG[status] : undefined;
  const providers: Provider[] = ["google", "microsoft"];
  return (
    <section className="panel" data-tip="Connectez votre boîte : les emails et relances partent d'elle, et les réponses des prospects remontent dans votre Point du jour.">
      <h2>Messagerie</h2>
      {msg && <p className={`alert ${msg[0]}`}>{msg[1]}</p>}
      {account ? (
        <>
          <p>Connectée : <b>{account.email}</b> <span className="chip ok">{PROVIDER_LABEL[account.provider as Provider]}</span></p>
          <p className="muted small">Vos emails de séquence partent de cette boîte. Les réponses des prospects sont lues à chaque Point du jour (dernière lecture : {account.lastSyncAt ? account.lastSyncAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }) : "jamais"}).</p>
          <form action={disconnectMail}><SubmitButton className="btn" pending="…">Déconnecter</SubmitButton></form>
        </>
      ) : (
        <>
          <p className="muted">Envoyez vos emails et relances en un clic depuis votre propre adresse, et retrouvez chaque matin les réponses de vos prospects.</p>
          <div className="row">
            {providers.map((p) => mailEnabled(p)
              ? <a key={p} className="btn primary" href={`/api/mail/${p}/connect`}>Connecter {PROVIDER_LABEL[p]}</a>
              : <button key={p} type="button" className="btn" disabled>Connecter {PROVIDER_LABEL[p]}</button>)}
          </div>
          {!providers.some(mailEnabled) && <p className="hint">Connexion pas encore activée : les identifiants Google et Microsoft de Cockpit&apos;ch restent à créer.</p>}
        </>
      )}
    </section>
  );
}
