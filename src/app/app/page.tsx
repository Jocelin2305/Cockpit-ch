import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { has, isDue, isEmail, todayISO } from "@/lib/prospecting";
import { AssistantChat } from "./assistant-chat";

export const metadata: Metadata = { title: "Espace de travail" };

export default async function WorkspacePage() {
  const { user, membership, onboarding } = await requireMember();
  // Première visite du jour (ou après une connexion) : le point du jour d'abord.
  if (!onboarding && user.briefingDay !== todayISO()) redirect("/app/point-du-jour");
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
          <span className="label">{membership.organization.name}</span>
          <h1>Bonjour {user.name.split(" ")[0]}</h1>
          <p className="muted">
            {due} relance{due > 1 ? "s" : ""} due{due > 1 ? "s" : ""} · {ready} email{ready > 1 ? "s" : ""} J0 prêt{ready > 1 ? "s" : ""} · {searchCount} recherche{searchCount > 1 ? "s" : ""} · {prospects.length} prospects
          </p>
        </div>
      </header>
      <AssistantChat suggestions={suggestions} aiReady={aiEnabled()} />
    </div>
  );
}
