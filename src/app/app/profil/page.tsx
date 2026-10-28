import type { Metadata } from "next";
import { requireMember } from "@/lib/auth";
import { SignatureForm } from "./signature-form";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const { user } = await requireMember();
  return (
    <div className="view narrow">
      <header className="view-head">
        <div><h1>Profil</h1><p className="muted">{user.name} · {user.email}</p></div>
      </header>
      <section className="panel">
        <h2>Signature des emails</h2>
        <p className="muted small">Elle remplace {"{signature}"} dans toutes vos séquences.</p>
        <SignatureForm signature={user.signature} />
      </section>
    </div>
  );
}
