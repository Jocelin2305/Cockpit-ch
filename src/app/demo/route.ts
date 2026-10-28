import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { createDemo } from "@/lib/demo";

// Lien de démo à partager : https://<site>/demo (option ?source=linkedin pour savoir d'où viennent les visiteurs).
export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("source") ?? "";
  const demo = await createDemo(source);
  if (!demo) redirect("/inscription?demo=plein");
  await createSession(demo.user.id, demo.org.id);
  redirect("/app/point-du-jour");
}
