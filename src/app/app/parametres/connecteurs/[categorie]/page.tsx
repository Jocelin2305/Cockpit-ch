import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember, ROLES } from "@/lib/auth";
import { connectorCategory } from "@/lib/connectors";
import { crmOauthEnabled } from "@/lib/crm-oauth";
import { CRM_PROVIDERS, type CrmProvider } from "@/lib/crm-providers";
import { supportEmail } from "@/lib/branding";
import { MailPanel } from "../../mail-panel";
import { CrmPanel } from "../../crm-panel";
import { PhonePanel } from "../../phone-panel";

export const metadata: Metadata = { title: "Connecteurs" };

// Une catégorie de connecteurs : les logiciels disponibles, connectables, et ceux à venir.
export default async function ConnectorCategoryPage({ params, searchParams }: { params: Promise<{ categorie: string }>; searchParams: Promise<{ mail?: string; crm?: string }> }) {
  const { categorie } = await params;
  const { mail, crm } = await searchParams;
  const cat = connectorCategory(categorie);
  if (!cat) notFound();
  const { user, membership } = await requireMember();
  const org = membership.organization;
  const locked = cat.admin && membership.role !== ROLES.ADMIN;
  const support = await supportEmail(org);
  const soon = cat.tools.filter((t) => t.soon);
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <span className="label">Connecteurs · facultatif</span>
          <h1>{cat.label}</h1>
          <p className="muted">{cat.desc}</p>
        </div>
        <Link className="btn" href="/app/parametres">Paramètres</Link>
      </header>
      {locked ? (
        <p className="alert">Ce connecteur est réglé par l&apos;administrateur de votre entreprise.</p>
      ) : (
        <div className="tool-list">
          {cat.id === "mailing" && <MailPanel userId={user.id} status={mail} />}
          {cat.id === "crm" && <CrmPanel provider={org.crmProvider} oauth={(Object.keys(CRM_PROVIDERS) as CrmProvider[]).filter(crmOauthEnabled)} status={crm} />}
          {cat.id === "voip" && <PhonePanel provider={org.phoneProvider} token={org.phoneWebhookToken} />}
          {soon.map((t) => (
            <div key={t.id} className="tool-soon">
              <div><b>{t.name}</b> <span className="chip">bientôt disponible</span></div>
              <a className="btn sm" href={`mailto:${support}?subject=${encodeURIComponent(`Connecteur ${t.name}`)}`}>Demander ce connecteur</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
