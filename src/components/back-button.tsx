"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// « ← Retour » sur toute page en dessous d'une rubrique du menu (fiche, sous-menu, bibliothèque ouverte).
export function BackButton() {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const parts = path.split("/").filter(Boolean);
  const openLibrary = path === "/app/prospects" && [...params.keys()].length > 0;
  if (parts.length <= 2 && !openLibrary) return null;
  const parent = openLibrary ? "/app/prospects" : `/${parts.slice(0, -1).join("/")}`;
  const back = () => {
    // Revient à la page précédente de l'appli, sinon à la page parente.
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back();
    else router.push(parent);
  };
  return <button type="button" className="back-btn" onClick={back}>← Retour</button>;
}
