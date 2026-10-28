import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return (
    <>
      <h1>Créer votre espace</h1>
      {demo === "plein" && <p className="alert">La démo est très demandée en ce moment : créez directement votre espace, c&apos;est gratuit pendant 14 jours.</p>}
      <p className="muted">Votre entreprise, vos commerciaux, vos prospects. Vous serez administrateur de l&apos;espace.</p>
      <SignupForm />
      <p className="muted small">
        Déjà un compte ? <Link href="/connexion">Se connecter</Link> · <Link href="/demo">Voir la démo</Link>
      </p>
    </>
  );
}
