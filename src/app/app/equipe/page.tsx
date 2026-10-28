import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireMember, ROLE_LABEL, ROLES } from "@/lib/auth";
import { ConfirmButton } from "@/components/forms";
import { changeRole, removeMember, revokeInvitation } from "./actions";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Équipe" };

const ERRORS: Record<string, string> = {
  "dernier-admin": "L'entreprise doit garder au moins un administrateur. Nommez-en un autre avant.",
};

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "jamais");

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { user, membership } = await requireMember();
  const { erreur } = await searchParams;
  const isAdmin = membership.role === ROLES.ADMIN;
  const orgId = membership.organizationId;
  const [members, invitations] = await Promise.all([
    db.membership.findMany({ where: { organizationId: orgId }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    isAdmin
      ? db.invitation.findMany({ where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <h1>Équipe</h1>
          <p className="muted">
            Les administrateurs gèrent l&apos;équipe, les recherches et les séquences. Les commerciaux travaillent leurs prospects et leurs appels.
          </p>
        </div>
      </header>

      {erreur && ERRORS[erreur] && <p className="alert error">{ERRORS[erreur]}</p>}

      {isAdmin && (
        <section className="panel">
          <h2>Inviter une personne</h2>
          <InviteForm />
        </section>
      )}

      <section className="panel flush">
        <div className="panel-head pad">
          <h2>Membres</h2>
          <span className="label">{members.length} personne{members.length > 1 ? "s" : ""}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Dernière connexion</th>
                {isAdmin && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <b>{m.user.name}</b>
                    {m.userId === user.id && <span className="chip">vous</span>}
                  </td>
                  <td>{m.user.email}</td>
                  <td>
                    {isAdmin ? (
                      <form action={changeRole} className="inline">
                        <input type="hidden" name="id" value={m.id} />
                        <select name="role" defaultValue={m.role} className="input sm" aria-label={`Rôle de ${m.user.name}`}>
                          <option value={ROLES.ADMIN}>{ROLE_LABEL.ADMIN}</option>
                          <option value={ROLES.MEMBER}>{ROLE_LABEL.MEMBER}</option>
                        </select>
                        <button className="btn sm ghost" type="submit">Changer</button>
                      </form>
                    ) : (
                      <span className={`chip ${m.role === ROLES.ADMIN ? "ok" : ""}`}>{ROLE_LABEL[m.role]}</span>
                    )}
                  </td>
                  <td className="muted">{fmt(m.user.lastLoginAt)}</td>
                  {isAdmin && (
                    <td>
                      {m.userId !== user.id && (
                        <form action={removeMember}>
                          <input type="hidden" name="id" value={m.id} />
                          <ConfirmButton confirm="Confirmer le retrait">Retirer</ConfirmButton>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && invitations.length > 0 && (
        <section className="panel flush">
          <div className="panel-head pad">
            <h2>Invitations en attente</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Expire le</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td>{ROLE_LABEL[i.role]}</td>
                    <td className="muted">{fmt(i.expiresAt)}</td>
                    <td>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={i.id} />
                        <ConfirmButton confirm="Confirmer l'annulation">Annuler</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
