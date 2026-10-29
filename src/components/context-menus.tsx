"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  deleteLibrary, deleteProspectById, deleteSequenceTemplate,
  resumeLibrarySequence, resumeProspectSequence, stopLibrarySequence, stopProspectSequence,
} from "@/app/app/menu-actions";

type Item = { label: string; run?: () => Promise<{ ok?: string; error?: string }>; href?: string; confirm?: string; danger?: boolean };
type Menu = { x: number; y: number; title: string; items: Item[] };

// Clic droit sur une ligne de prospect, une bibliothèque ou une séquence (attributs data-menu, data-id, data-name).
export function ContextMenus({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [toast, setToast] = useState<{ ok?: string; error?: string } | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    const open = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-menu]");
      if (!el) return;
      const { menu: kind = "", id = "", name = "", stopped } = el.dataset;
      const items = itemsFor(kind, id, name, stopped === "1", isAdmin);
      if (!items.length) return;
      e.preventDefault();
      setMenu({ x: Math.min(e.clientX, window.innerWidth - 260), y: Math.min(e.clientY, window.innerHeight - 40 * items.length - 50), title: name, items });
    };
    const close = () => setMenu(null);
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("contextmenu", open);
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("contextmenu", open);
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("keydown", key);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const choose = (it: Item) => {
    setMenu(null);
    if (it.href) return router.push(it.href);
    if (it.confirm && !window.confirm(it.confirm)) return;
    start(async () => {
      const r = await it.run!();
      setToast(r);
      router.refresh();
    });
  };

  return (
    <>
      {menu && (
        <div className="ctx" role="menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          {menu.title && <span className="ctx-title">{menu.title}</span>}
          {menu.items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={it.danger ? "danger" : undefined} onClick={() => choose(it)}>{it.label}</button>
          ))}
        </div>
      )}
      {toast && <div className={`ctx-toast${toast.error ? " error" : ""}`} role="status">{toast.error ?? toast.ok}</div>}
    </>
  );
}

function itemsFor(kind: string, id: string, name: string, stopped: boolean, isAdmin: boolean): Item[] {
  if (kind === "prospect")
    return [
      { label: "Ouvrir la fiche", href: `/app/prospects/${id}` },
      stopped
        ? { label: "Reprendre la séquence", run: () => resumeProspectSequence(id) }
        : { label: "Stopper la séquence", run: () => stopProspectSequence(id) },
      ...(isAdmin ? [{ label: "Supprimer le prospect", danger: true, confirm: `Supprimer définitivement ${name} (fiche, appels et emails) ?`, run: () => deleteProspectById(id) }] : []),
    ];
  if (kind === "library")
    return [
      { label: "Ouvrir la bibliothèque", href: `/app/prospects?recherche=${id}` },
      { label: "Stopper la séquence de tous ses prospects", run: () => stopLibrarySequence(id) },
      { label: "Reprendre la séquence", run: () => resumeLibrarySequence(id) },
      ...(isAdmin
        ? [
            { label: "Modifier la recherche", href: `/app/recherches/${id}/modifier` },
            { label: "Supprimer la bibliothèque et ses prospects", danger: true, confirm: `Supprimer « ${name} » et tous ses prospects (fiches, appels, emails) ? C'est définitif.`, run: () => deleteLibrary(id) },
          ]
        : []),
    ];
  if (kind === "template")
    return [
      { label: "Ouvrir la séquence", href: `/app/sequences/${id}` },
      ...(isAdmin ? [{ label: "Supprimer la séquence", danger: true, confirm: `Supprimer la séquence « ${name} » ? Les recherches qui l'utilisent n'auront plus de séquence.`, run: () => deleteSequenceTemplate(id) }] : []),
    ];
  return [];
}
