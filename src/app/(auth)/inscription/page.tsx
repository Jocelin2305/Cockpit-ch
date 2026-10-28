import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <>
      <h1>Créer votre espace</h1>
      <p className="muted">Votre entreprise, vos commerciaux, vos prospects. Vous serez administrateur de l&apos;espace.</p>
      <SignupForm />
      <p className="muted small">
        Déjà un compte ? <Link href="/connexion">Se connecter</Link>
      </p>
    </>
  );
}
