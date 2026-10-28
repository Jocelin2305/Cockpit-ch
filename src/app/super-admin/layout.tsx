import { Brand } from "@/components/brand";
import { NavLinks } from "@/components/shell";
import { requireSuperAdmin } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireSuperAdmin();
  return (
    <div className="shell">
      <aside className="rail rail-super">
        <Brand sub="Super admin" />
        <NavLinks
          items={[
            { href: "/super-admin", label: "Vue d'ensemble" },
            ...(membership ? [{ href: "/app", label: "Mon espace" }] : []),
          ]}
        />
        <div className="rail-foot">
          <div>
            <b>{user.name}</b>
            <span className="muted small">Accès à toutes les entreprises</span>
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
