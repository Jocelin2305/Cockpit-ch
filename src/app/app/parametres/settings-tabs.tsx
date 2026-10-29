"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Onglets de Paramètres : réglages généraux et connecteurs.
export function SettingsTabs() {
  const path = usePathname();
  const tabs = [
    { href: "/app/parametres", label: "Général", on: path === "/app/parametres" },
    { href: "/app/parametres/connecteurs", label: "Connecteurs", on: path.startsWith("/app/parametres/connecteurs") },
  ];
  return (
    <nav className="tabs" aria-label="Paramètres">
      {tabs.map((t) => <Link key={t.href} href={t.href} aria-current={t.on ? "page" : undefined}>{t.label}</Link>)}
    </nav>
  );
}
