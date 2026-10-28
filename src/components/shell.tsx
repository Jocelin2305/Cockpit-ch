"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; soon?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Navigation principale">
      {items.map((item) => {
        const active = item.href === "/app" ? path === "/app" : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            <span>{item.label}</span>
            {item.soon && <span className="count">bientôt</span>}
          </Link>
        );
      })}
    </nav>
  );
}
