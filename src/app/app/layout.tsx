import { Brand } from "@/components/brand";
import { NavLinks, type NavItem } from "@/components/shell";
import { requireMember, ROLE_LABEL, ROLES } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireMember();
  const items: NavItem[] = [
    { href: "/app", label: "Espace de travail" },
    { href: "/app/equipe", label: "Équipe" },
    ...(membership.role === ROLES.ADMIN ? [{ href: "/app/parametres", label: "Paramètres" }] : []),
    ...(user.isSuperAdmin ? [{ href: "/super-admin", label: "Super admin" }] : []),
  ];

  return (
    <div className="shell">
      <aside className="rail">
        <Brand sub={membership.organization.name} />
        <NavLinks items={items} />
        <div className="rail-foot">
          <div>
            <b>{user.name}</b>
            <span className="muted small">{ROLE_LABEL[membership.role]}</span>
          </div>
          <form action={logout}>
            <button className="btn sm ghost" type="submit">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
