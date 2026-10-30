import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { newToken, requireAdmin } from "@/lib/auth";
import { crmAuthUrl, crmOauthEnabled } from "@/lib/crm-oauth";
import { isCrmProvider } from "@/lib/crm-providers";

// Démarre la connexion du CRM : le client autorise Cockpit'ch depuis son compte.
export async function GET(_: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { membership } = await requireAdmin();
  const { provider } = await params;
  if (!isCrmProvider(provider) || !crmOauthEnabled(provider)) redirect("/app/parametres/connecteurs/crm?crm=indisponible");
  const state = newToken();
  (await cookies()).set("cp_crm_state", `${provider}:${membership.organizationId}:${state}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  redirect(crmAuthUrl(provider, state));
}
