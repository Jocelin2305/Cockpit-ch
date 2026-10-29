import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { connectAccount, isProvider, MailError } from "@/lib/mail";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { user } = await requireMember();
  const { provider } = await params;
  const url = new URL(request.url);
  const jar = await cookies();
  const expected = jar.get("cp_mail_state")?.value;
  jar.delete("cp_mail_state");
  const code = url.searchParams.get("code");
  if (!isProvider(provider) || !code || expected !== `${provider}:${url.searchParams.get("state")}`) redirect("/app/parametres/connecteurs/mailing?mail=refuse");
  let ok = true;
  try {
    await connectAccount(provider, code, user.id);
  } catch (e) {
    if (!(e instanceof MailError)) console.error(e);
    ok = false;
  }
  redirect(`/app/parametres/connecteurs/mailing?mail=${ok ? "ok" : "erreur"}`);
}
