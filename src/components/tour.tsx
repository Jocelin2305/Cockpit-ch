"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setTourStep } from "@/app/app/aide/actions";

type Step = { path: string; href?: string; target?: string; title: string; text: string };

// Visite guidée de la prise en main, page après page.
const STEPS: Step[] = [
  { path: "/app", target: "briefing", title: "Votre agent IA et votre point du jour", text: "Dès que vous ouvrez Cockpit'ch, votre agent vous fait le point : rappels prévus, prospects qui ont répondu, relances à envoyer. Vous savez quoi faire dès la première minute." },
  { path: "/app", target: "calls", title: "Vos appels, dans l'ordre", text: "La file d'appels est triée pour vous. Cliquez sur un numéro : l'appel part et un panneau s'ouvre pour noter ce qui se dit. Essayez !" },
  { path: "/app", target: "inbox", title: "Rien ne vous échappe", text: "Réponses des prospects, messages vocaux, appels manqués : tout remonte ici avec un bouton pour rappeler." },
  { path: "/app", target: "assistant", title: "Votre assistant", text: "Demandez ce que vous voulez comme à un collègue : « Qui dois-je relancer aujourd'hui ? », « Rédige l'angle pour la Clinique du Parc »…" },
  { path: "/app/prospects", href: "/app/prospects?recherche=tous", target: "table", title: "Le tableau de suivi", text: "Cliquez sur une bibliothèque pour ouvrir ses prospects : priorité modifiable, angle commercial (cliquez pour l'argumentaire complet), coordonnées T / E / L au clic, notes sur la ligne. « Lancer la séquence » envoie l'email J0 à tous en un clic." },
  { path: "/app/prospects", target: "fab", title: "Saisir un appel à la main", text: "Ce bouton en bas à droite sert à noter un appel passé depuis votre portable : choisissez le prospect, tapez vos notes, la fiche se met à jour." },
  { path: "/app/sequences", title: "Séquences messages", text: "Un email de départ, des relances (vous choisissez combien) espacées automatiquement et les messages LinkedIn en parallèle. Les textes se personnalisent pour chaque prospect." },
  { path: "/app/tableau-de-bord", target: "stats", title: "Vos résultats", text: "Taux de réponse, rendez-vous, temps passé au téléphone… Le manager voit aussi les chiffres de chaque commercial." },
  { path: "/app/aide", title: "Besoin d'aide ?", text: "Le Centre d'aide garde les infobulles (points orange), les réponses rapides et le support. Vous pouvez y relancer cette visite à tout moment." },
];

export function Tour({ initialStep }: { initialStep: number | null }) {
  const path = usePathname();
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [, start] = useTransition();
  const current = step !== null ? STEPS[step] : undefined;

  // Met en évidence l'élément expliqué par l'étape.
  useEffect(() => {
    if (!current?.target || current.path !== path) return;
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (!el) return;
    el.classList.add("tour-target");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => el.classList.remove("tour-target");
  }, [current, path]);

  if (!current) return null;
  const go = (next: number | null) => {
    setStep(next);
    start(() => setTourStep(next));
    if (next !== null && STEPS[next] && STEPS[next].path !== path) router.push(STEPS[next].href ?? STEPS[next].path);
  };
  const last = step === STEPS.length - 1;

  return (
    <aside className="tour" role="dialog" aria-label="Visite guidée">
      <span className="label">Visite guidée · {step! + 1}/{STEPS.length}</span>
      <h2>{current.title}</h2>
      <p>{current.text}</p>
      {current.path !== path && <p className="hint">Cette étape se trouve sur une autre page.</p>}
      <div className="row between">
        <button type="button" className="btn sm ghost" onClick={() => go(null)}>Quitter la visite</button>
        <div className="inline">
          {step! > 0 && <button type="button" className="btn sm" onClick={() => go(step! - 1)}>Précédent</button>}
          {current.path !== path
            ? <button type="button" className="btn sm primary" onClick={() => go(step!)}>Y aller</button>
            : last
              ? <button type="button" className="btn sm primary" onClick={() => go(null)}>Terminer</button>
              : <button type="button" className="btn sm primary" onClick={() => go(step! + 1)}>Suivant</button>}
        </div>
      </div>
    </aside>
  );
}
