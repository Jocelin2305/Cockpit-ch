import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { newToken, requireMember } from "@/lib/auth";
import { authUrl, isProvider, mailEnabled } from "@/lib/mail";

// Démarre la connexion OAuth de la boîte mail de l'utilisateur.
export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { membership } = await requireMember();
  const { provider } = await params;
  if (!isProvider(provider) || !mailEnabled(provider)) redirect("/app/parametres/connecteurs/mailing?mail=indisponible");
  const state = newToken();
  (await cookies()).set("cp_mail_state", `${provider}:${state}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  redirect(authUrl(provider, state));
}
