import { Brand } from "@/components/brand";
import { NavLinks } from "@/components/shell";
import { requireAdminSpace } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, reseller, resellerId } = await requireAdminSpace();
  const role = user.isFounder ? "Fondateur" : resellerId ? "Super admin revendeur" : "Super admin";
  return (
    <div className="shell">
      <aside className="rail rail-super">
        <Brand sub={role} />
        <NavLinks
          items={[
            { href: "/super-admin", label: resellerId ? "Mes clients" : "Vue d'ensemble" },
            ...(user.isFounder ? [{ href: "/super-admin/partenaires", label: "Partenaires revendeurs" }] : []),
            ...(reseller ? [{ href: "/super-admin/affilie", label: "Espace affilié" }] : []),
            ...(membership ? [{ href: "/app", label: "Mon espace" }] : []),
          ]}
        />
        <div className="rail-foot">
          <div>
            <b>{user.name}</b>
            <span className="muted small">{role} · {resellerId ? "vos clients" : "toutes les entreprises"}</span>
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
