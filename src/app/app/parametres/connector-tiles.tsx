import Link from "next/link";
import { db } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { apolloPlatform } from "@/lib/apollo";
import { CRM_PROVIDERS, type CrmProvider } from "@/lib/crm-providers";
import { PHONE_PROVIDERS, type PhoneProvider } from "@/lib/telephony";
import { PROVIDER_LABEL, type Provider } from "@/lib/mail";
import { CONNECTOR_CATEGORIES, CONNECTORS_PATH } from "@/lib/connectors";

type Org = { crmProvider: string | null; phoneProvider: string | null; apolloKeyEnc: string | null; aiKeyEnc: string | null };

// Vignettes des connecteurs : état de chacun, bandeau « Obligatoire » ou « Facultatif ».
export async function ConnectorTiles({ userId, org, isAdmin }: { userId: string; org: Org; isAdmin: boolean }) {
  const mail = await db.mailAccount.findUnique({ where: { userId }, select: { email: true, provider: true } });
  const status: Record<string, string | null> = {
    ia: org.aiKeyEnc ? "Claude · votre clé" : aiEnabled() ? "Claude · clé de la plateforme" : null,
    enrichissement: org.apolloKeyEnc ? "Apollo" : null,
    mailing: mail ? `${PROVIDER_LABEL[mail.provider as Provider]} · ${mail.email}` : null,
    crm: org.crmProvider ? CRM_PROVIDERS[org.crmProvider as CrmProvider] ?? org.crmProvider : null,
    voip: org.phoneProvider ? PHONE_PROVIDERS[org.phoneProvider as PhoneProvider] ?? org.phoneProvider : null,
    automatisation: null,
  };
  // IA et enrichissement fournis par la plateforme (payés en crédits) : plus rien à connecter pour le client.
  const provided: Record<string, boolean> = { ia: aiEnabled() && !org.aiKeyEnc, enrichissement: apolloPlatform() && !org.apolloKeyEnc };
  const categories = CONNECTOR_CATEGORIES.filter((c) => !provided[c.id]);
  const missing = categories.filter((c) => c.required && !status[c.id]);
  return (
    <section className="stack">
      <h2>Connecteurs</h2>
      {isAdmin && missing.length > 0 && <p className="alert">À connecter pour utiliser Cockpit&apos;ch pleinement : {missing.map((c) => c.label).join(" et ")}.</p>}
      <div className="tiles">
        {categories.map((c) => {
          const locked = c.admin && !isAdmin;
          const body = (
            <>
              <span className={`tile-band${c.required ? " required" : ""}`}>{c.required ? "Obligatoire" : "Facultatif"}</span>
              <div className="row between"><b>{c.label}</b>{status[c.id] ? <span className="chip ok">connecté</span> : <span className="chip">à connecter</span>}</div>
              <span className="muted small">{c.desc}</span>
              <span className="small">{status[c.id] ?? c.tools.map((t) => `${t.name}${t.recommended ? " (recommandé)" : ""}`).join(" · ")}</span>
              {locked && <span className="muted small">Réglé par l&apos;administrateur</span>}
            </>
          );
          return locked ? <div key={c.id} className="tile off">{body}</div> : <Link key={c.id} href={`${CONNECTORS_PATH}/${c.id}`} className="tile">{body}</Link>;
        })}
      </div>
    </section>
  );
}
