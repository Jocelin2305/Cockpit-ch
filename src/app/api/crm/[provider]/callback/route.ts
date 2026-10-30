import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { connectCrmAccount, CrmError } from "@/lib/crm-oauth";
import { isCrmProvider } from "@/lib/crm-providers";

const PAGE = "/app/parametres/connecteurs/crm";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { membership } = await requireAdmin();
  const { provider } = await params;
  const url = new URL(request.url);
  const jar = await cookies();
  const expected = jar.get("cp_crm_state")?.value;
  jar.delete("cp_crm_state");
  const code = url.searchParams.get("code");
  // Le retour doit correspondre au CRM et à l'entreprise qui ont lancé la connexion.
  if (!isCrmProvider(provider) || !code || expected !== `${provider}:${membership.organizationId}:${url.searchParams.get("state")}`) redirect(`${PAGE}?crm=refuse`);
  let ok = true;
  try {
    await connectCrmAccount(provider, code, membership.organizationId);
  } catch (e) {
    if (!(e instanceof CrmError)) console.error(e);
    ok = false;
  }
  redirect(`${PAGE}?crm=${ok ? "ok" : "erreur"}`);
}
