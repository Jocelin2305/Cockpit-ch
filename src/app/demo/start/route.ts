import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { createDemo } from "@/lib/demo";

// Crée l'espace de démo du visiteur ; ?guide=1 lance la visite guidée pas à pas.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const demo = await createDemo(params.get("source") ?? "", params.get("guide") === "1");
  if (!demo) redirect("/inscription?demo=plein");
  await createSession(demo.user.id, demo.org.id);
  redirect("/app");
}
