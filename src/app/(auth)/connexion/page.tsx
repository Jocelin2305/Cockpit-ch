import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

const NOTICES: Record<string, string> = {
  "sans-entreprise": "Votre compte n'est rattaché à aucune entreprise. Demandez une invitation à votre administrateur.",
  reinitialise: "Mot de passe modifié. Connectez-vous avec le nouveau.",
  supprime: "Votre entreprise et ses données ont été supprimées.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next, erreur } = await searchParams;
  return (
    <>
      <h1>Connexion</h1>
      {erreur && NOTICES[erreur] && <p className="alert">{NOTICES[erreur]}</p>}
      <LoginForm next={next ?? ""} />
      <p className="muted small">
        <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link> · Pas encore de compte ? <Link href="/inscription">Créer un espace</Link>
      </p>
    </>
  );
}
