import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ demo?: string; partenaire?: string }> }) {
  const { demo, partenaire } = await searchParams;
  const code = partenaire?.trim().slice(0, 20);
  const reseller = code ? await db.reseller.findFirst({ where: { code, active: true }, select: { companyName: true } }) : null;
  return (
    <>
      <h1>Créer votre espace</h1>
      {demo === "plein" && <p className="alert">La démo est très demandée en ce moment : créez directement votre espace, c&apos;est gratuit pendant 14 jours.</p>}
      {reseller && <p className="alert ok">Invitation de {reseller.companyName || "votre partenaire"} : votre premier mois est offert.</p>}
      <p className="muted">Votre entreprise, vos commerciaux, vos prospects. Vous serez administrateur de l&apos;espace.</p>
      <SignupForm partner={reseller ? code : undefined} />
      <p className="muted small">
        Déjà un compte ? <Link href="/connexion">Se connecter</Link> · <Link href="/demo">Voir la démo</Link>
      </p>
    </>
  );
}
