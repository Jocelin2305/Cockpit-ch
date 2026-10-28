"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; count?: number; alert?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="nav">
      {items.map((item) => {
        const active = item.href === "/app" ? path === "/app" : path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            <span className="nm">{item.label}</span>
            {item.count !== undefined && <span className={`count${item.alert ? " alert" : ""}`}>{item.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
