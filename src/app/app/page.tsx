import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { has, isDue, isEmail, todayISO } from "@/lib/prospecting";
import { AssistantChat } from "./assistant-chat";
import { Briefing } from "./briefing";

export const metadata: Metadata = { title: "Espace de travail" };

export default async function WorkspacePage() {
  const { user, membership } = await requireMember();
  const orgId = membership.organizationId;
  const [prospects, searchCount] = await Promise.all([
    db.prospect.findMany({ where: { organizationId: orgId }, select: { status: true, relances: true, nextFollowUp: true, email: true, searchId: true, angle: true } }),
    db.search.count({ where: { organizationId: orgId } }),
  ]);
  const today = todayISO();
  const due = prospects.filter((p) => isDue(p, today)).length;
  const ready = prospects.filter((p) => p.status === "À contacter" && p.searchId && isEmail(p.email)).length;
  const noAngle = prospects.filter((p) => !has(p.angle) && !["Gagné", "Perdu"].includes(p.status)).length;

  // Suggestions adaptées à la journée, puis des demandes génériques.
  const suggestions = [
    ...(due ? [`Quelles sont mes ${due} relances dues aujourd'hui ? Donne-moi les textes.`] : []),
    ...(noAngle ? [`Rédige les ${noAngle} angles commerciaux manquants`] : []),
    ...(ready ? [`Prépare l'email J0 de mes prospects prêts`] : []),
    "Quel prospect contacter en premier aujourd'hui, et avec quel angle ?",
    "Ajoute la société Durand Logistique à Lyon, priorité haute",
    "Analyse mon pipeline et dis-moi quoi faire cette semaine",
  ].slice(0, 5);

  return (
    <div className="view ws">
      <header className="view-head">
        <div>
          <span className="label">{membership.organization.name} · {searchCount} recherche{searchCount > 1 ? "s" : ""} · {prospects.length} prospects</span>
          <h1>Espace de travail</h1>
        </div>
      </header>
      <AssistantChat suggestions={suggestions} aiReady={aiEnabled()} intro={<Briefing user={user} membership={membership} />} />
    </div>
  );
}
