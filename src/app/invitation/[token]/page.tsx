import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { SubmitButton } from "@/components/forms";
import { getSession, ROLE_LABEL } from "@/lib/auth";
import { findInvitation } from "@/lib/invitations";
import { acceptAsCurrentUser } from "./actions";
import { AcceptForm } from "./accept-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await findInvitation(token);
  const session = await getSession();

  let body: React.ReactNode;
  if (!invitation) {
    body = (
      <>
        <h1>Invitation expirée</h1>
        <p className="muted">Ce lien n&apos;est plus valable. Demandez une nouvelle invitation à l&apos;administrateur de votre entreprise.</p>
      </>
    );
  } else if (session && session.user.email === invitation.email) {
    body = (
      <>
        <h1>Rejoindre {invitation.organization.name}</h1>
        <p className="muted">Vous êtes connecté avec {invitation.email}. Vous rejoindrez l&apos;équipe en tant que {ROLE_LABEL[invitation.role].toLowerCase()}.</p>
        <form action={acceptAsCurrentUser}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton pending="Un instant…">Rejoindre l&apos;équipe</SubmitButton>
        </form>
      </>
    );
  } else if (await db.user.findUnique({ where: { email: invitation.email }, select: { id: true } })) {
    body = (
      <>
        <h1>Rejoindre {invitation.organization.name}</h1>
        <p className="muted">Un compte existe déjà pour {invitation.email}. Connectez-vous avec ce compte pour accepter l&apos;invitation.</p>
        <Link className="btn primary" href={`/connexion?next=/invitation/${token}`}>Se connecter</Link>
      </>
    );
  } else {
    body = (
      <>
        <h1>Rejoindre {invitation.organization.name}</h1>
        <p className="muted">Créez votre accès pour {invitation.email}. Rôle : {ROLE_LABEL[invitation.role].toLowerCase()}.</p>
        <AcceptForm token={token} />
      </>
    );
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <span className="auth-brand"><Brand /></span>
        {body}
      </div>
    </main>
  );
}
