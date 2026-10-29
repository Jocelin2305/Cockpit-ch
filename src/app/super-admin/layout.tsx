import { Brand } from "@/components/brand";
import { NavLinks, type NavItem } from "@/components/shell";
import { requireAdminSpace } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, reseller, resellerId } = await requireAdminSpace();
  const role = user.isFounder ? "Fondateur" : resellerId ? "Super admin revendeur" : "Super admin";
  // Menu par rubrique ; un revendeur ne voit que ses clients et son Espace affilié.
  const groups: { label: string; items: NavItem[] }[] = [
    { label: "Pilotage", items: [{ href: "/super-admin", label: "Vue d'ensemble" }] },
    {
      label: resellerId ? "Mes clients" : "Clients",
      items: [
        { href: "/super-admin/clients", label: resellerId ? "Mes clients" : "Entreprises clientes" },
        { href: "/super-admin/utilisateurs", label: "Utilisateurs" },
      ],
    },
    ...(user.isFounder
      ? [{
          label: "Partenaires",
          items: [
            { href: "/super-admin/partenaires", label: "Mes partenaires revendeurs" },
            { href: "/super-admin/partenaires/communications", label: "Communications" },
            { href: "/super-admin/partenaires/videos", label: "Vidéos de formation" },
          ],
        }]
      : []),
    ...(reseller ? [{ label: "Partenaire", items: [{ href: "/super-admin/affilie", label: "Espace affilié" }] }] : []),
    ...(membership ? [{ label: "Mon entreprise", items: [{ href: "/app", label: "Mon espace de travail" }] }] : []),
  ];
  return (
    <div className="shell">
      <aside className="rail rail-super">
        <Brand sub={role} />
        {groups.map((g) => (
          <div key={g.label} className="navsec hl">
            <span className="label">{g.label}</span>
            <NavLinks items={g.items} />
          </div>
        ))}
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
