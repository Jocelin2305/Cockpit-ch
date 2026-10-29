"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number; alert?: boolean; tip?: string };

// Racines d'espace : actives uniquement sur leur propre page.
const ROOTS = ["/app", "/super-admin"];
const isActive = (path: string, href: string) => (ROOTS.includes(href) ? path === href : path === href || path.startsWith(`${href}/`));

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  // Le lien le plus précis l'emporte (Communications plutôt que Mes partenaires revendeurs).
  const current = items.filter((i) => isActive(path, i.href)).sort((x, y) => y.href.length - x.href.length)[0]?.href;
  return (
    <nav className="nav">
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.href === current ? "page" : undefined} data-tip={item.tip}>
          <span className="nm">{item.label}</span>
          {item.count !== undefined && <span className={`count${item.alert ? " alert" : ""}`}>{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

// Menu déroulant : fermé par défaut, ouvert quand on est sur l'une de ses pages.
export function NavMenu({ label, items }: { label: string; items: NavItem[] }) {
  const path = usePathname();
  const open = items.some((i) => isActive(path, i.href));
  return (
    <details className="navsec hl dd" open={open || undefined} key={String(open)}>
      <summary className="label">{label}</summary>
      <NavLinks items={items} />
    </details>
  );
}
