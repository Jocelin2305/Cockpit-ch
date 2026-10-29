import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember, ROLES } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { CRM_PROVIDERS, type CrmProvider } from "@/lib/crm-providers";
import { PHONE_PROVIDERS, type PhoneProvider } from "@/lib/telephony";
import { PROVIDER_LABEL, type Provider } from "@/lib/mail";
import { CONNECTOR_CATEGORIES, CONNECTORS_PATH } from "@/lib/connectors";
import { SettingsTabs } from "../settings-tabs";

export const metadata: Metadata = { title: "Connecteurs" };

// Vue d'ensemble des connecteurs : une carte par catégorie, avec ce qui est déjà branché.
export default async function ConnectorsPage() {
  const { user, membership } = await requireMember();
  const org = membership.organization;
  const isAdmin = membership.role === ROLES.ADMIN;
  const mail = await db.mailAccount.findUnique({ where: { userId: user.id }, select: { email: true, provider: true } });
  const status: Record<string, string | null> = {
    mailing: mail ? `${PROVIDER_LABEL[mail.provider as Provider]} · ${mail.email}` : null,
    crm: org.crmProvider ? CRM_PROVIDERS[org.crmProvider as CrmProvider] ?? org.crmProvider : null,
    voip: org.phoneProvider ? PHONE_PROVIDERS[org.phoneProvider as PhoneProvider] ?? org.phoneProvider : null,
    ia: aiEnabled() ? "Claude (Anthropic), fourni par Cockpit'ch" : null,
    enrichissement: org.apolloKeyEnc ? "Apollo.io" : null,
  };
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <h1>Paramètres</h1>
          <p className="muted">Branchez les logiciels dont vous avez besoin : cliquez sur une catégorie pour voir les connecteurs disponibles.</p>
        </div>
      </header>
      <SettingsTabs />
      <div className="cards">
        {CONNECTOR_CATEGORIES.map((c) => (
          <Link key={c.id} href={`${CONNECTORS_PATH}/${c.id}`} className="card connector-card">
            <div className="row between"><b>{c.label}</b>{status[c.id] ? <span className="chip ok">connecté</span> : <span className="chip">à connecter</span>}</div>
            <span className="muted small">{c.desc}</span>
            <span className="small">{status[c.id] ?? c.tools.join(" · ")}</span>
            {c.admin && !isAdmin && <span className="muted small">Réglé par l&apos;administrateur</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
