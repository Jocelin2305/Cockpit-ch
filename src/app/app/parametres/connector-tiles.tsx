import Link from "next/link";
import { db } from "@/lib/db";
import { CRM_PROVIDERS, type CrmProvider } from "@/lib/crm-providers";
import { PHONE_PROVIDERS, type PhoneProvider } from "@/lib/telephony";
import { PROVIDER_LABEL, type Provider } from "@/lib/mail";
import { CONNECTOR_CATEGORIES, CONNECTORS_PATH } from "@/lib/connectors";

type Org = { crmProvider: string | null; phoneProvider: string | null };

// Vignettes des connecteurs, tous facultatifs : état de chacun.
export async function ConnectorTiles({ userId, org, isAdmin }: { userId: string; org: Org; isAdmin: boolean }) {
  const mail = await db.mailAccount.findUnique({ where: { userId }, select: { email: true, provider: true } });
  const status: Record<string, string | null> = {
    mailing: mail ? `${PROVIDER_LABEL[mail.provider as Provider]} · ${mail.email}` : null,
    crm: org.crmProvider ? CRM_PROVIDERS[org.crmProvider as CrmProvider] ?? org.crmProvider : null,
    voip: org.phoneProvider ? PHONE_PROVIDERS[org.phoneProvider as PhoneProvider] ?? org.phoneProvider : null,
    automatisation: null,
  };
  return (
    <section className="stack">
      <h2>Connecteurs</h2>
      <div className="tiles">
        {CONNECTOR_CATEGORIES.map((c) => {
          const locked = c.admin && !isAdmin;
          const body = (
            <>
              <span className="tile-band">Facultatif</span>
              <div className="row between"><b>{c.label}</b>{status[c.id] ? <span className="chip ok">connecté</span> : <span className="chip">à connecter</span>}</div>
              <span className="muted small">{c.desc}</span>
              <span className="small">{status[c.id] ?? c.tools.map((t) => t.name).join(" · ")}</span>
              {locked && <span className="muted small">Réglé par l&apos;administrateur</span>}
            </>
          );
          return locked ? <div key={c.id} className="tile off">{body}</div> : <Link key={c.id} href={`${CONNECTORS_PATH}/${c.id}`} className="tile">{body}</Link>;
        })}
      </div>
    </section>
  );
}
