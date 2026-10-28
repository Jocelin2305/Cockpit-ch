import { redirect } from "next/navigation";

// Le point du jour vit désormais dans l'Espace de travail, comme première réponse de l'agent.
export default function BriefingRedirect() {
  redirect("/app");
}
