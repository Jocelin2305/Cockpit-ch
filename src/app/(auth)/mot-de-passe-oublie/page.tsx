import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return (
    <>
      <h1>Mot de passe oublié</h1>
      <p className="muted">Indiquez l&apos;email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <ForgotForm />
      <p className="muted small"><Link href="/connexion">← Retour à la connexion</Link></p>
    </>
  );
}
