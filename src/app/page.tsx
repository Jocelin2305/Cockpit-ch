import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  redirect(session.membership ? "/app" : session.user.isSuperAdmin ? "/super-admin" : "/connexion?erreur=sans-entreprise");
}
