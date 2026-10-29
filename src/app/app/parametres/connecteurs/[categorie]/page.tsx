import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember, ROLES } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { connectorCategory, CONNECTORS_PATH } from "@/lib/connectors";
import { SettingsTabs } from "../../settings-tabs";
import { MailPanel } from "../../mail-panel";
import { CrmPanel } from "../../crm-panel";
import { PhonePanel } from "../../phone-panel";
import { ApolloPanel } from "../../apollo-panel";

export const metadata: Metadata = { title: "Connecteurs" };

// Une catégorie de connecteurs : les logiciels disponibles et leur connexion.
export default async function ConnectorCategoryPage({ params, searchParams }: { params: Promise<{ categorie: string }>; searchParams: Promise<{ mail?: string }> }) {
  const { categorie } = await params;
  const { mail } = await searchParams;
  const cat = connectorCategory(categorie);
  if (!cat) notFound();
  const { user, membership } = await requireMember();
  const org = membership.organization;
  const isAdmin = membership.role === ROLES.ADMIN;
  const locked = cat.admin && !isAdmin;
  return (
    <div className="view narrow">
      <header className="view-head">
        <div>
          <span className="label">Connecteurs</span>
          <h1>{cat.label}</h1>
          <p className="muted">{cat.desc}</p>
        </div>
        <Link className="btn" href={CONNECTORS_PATH}>Tous les connecteurs</Link>
      </header>
      <SettingsTabs />
      {locked ? (
        <p className="alert">Ce connecteur est réglé par l&apos;administrateur de votre entreprise.</p>
      ) : cat.id === "mailing" ? (
        <MailPanel userId={user.id} status={mail} />
      ) : cat.id === "crm" ? (
        <CrmPanel provider={org.crmProvider} />
      ) : cat.id === "voip" ? (
        <PhonePanel provider={org.phoneProvider} token={org.phoneWebhookToken} />
      ) : cat.id === "enrichissement" ? (
        <ApolloPanel connected={!!org.apolloKeyEnc} />
      ) : (
        <section className="panel">
          <h2>Claude (Anthropic)</h2>
          {aiEnabled() ? (
            <p>Actif : <span className="chip ok">inclus dans votre abonnement</span></p>
          ) : (
            <p className="muted">L&apos;IA est en cours d&apos;activation sur Cockpit&apos;ch : elle sera disponible ici sans rien configurer.</p>
          )}
          <p className="muted small">Le Copilote IA, les angles commerciaux, les séquences sur mesure et les comptes rendus d&apos;appels utilisent Claude. Aucune clé à fournir : la connexion est gérée par Cockpit&apos;ch, et vos données ne servent pas à entraîner les modèles.</p>
        </section>
      )}
      <p className="hint">Besoin d&apos;un autre logiciel ? Écrivez-nous depuis le Centre d&apos;aide : les connecteurs s&apos;ajoutent selon les demandes.</p>
    </div>
  );
}
