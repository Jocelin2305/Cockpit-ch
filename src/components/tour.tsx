"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { setTourStep } from "@/app/app/aide/actions";

// Guide de prise en main repris du prototype : l'écran s'assombrit, l'élément expliqué reste éclairé, une bulle le commente.
type Step = { path?: string; href?: string; target?: string; title: string; text: string };

const STEPS: Step[] = [
  { title: "Bienvenue dans Cockpit'ch", text: "En 1 minute, voici comment trouver vos prospects, les contacter au bon moment et suivre chaque relance. Vous pouvez quitter le guide à tout moment." },
  { target: "search", title: "1. Recherchez des prospects", text: "Tout commence ici : quelques questions sur votre cible (zone, secteur, taille, offre). Cockpit'ch trouve les entreprises et prépare la séquence d'emails adaptée." },
  { path: "/app", target: "briefing", title: "2. Votre point du jour", text: "Chaque matin, votre agent IA vous dit quoi faire : rappels prévus, réponses reçues, relances à envoyer. Un clic par action." },
  { path: "/app", target: "assistant", title: "3. L'assistant", text: "Demandez en une phrase : « Qui dois-je relancer aujourd'hui ? », « Rédige l'angle pour la Clinique du Parc »… Il agit directement dans l'outil." },
  { path: "/app/prospects", href: "/app/prospects", target: "library", title: "4. Vos bibliothèques", text: "Chaque recherche devient une bibliothèque de prospects. Cliquez pour l'ouvrir ; clic droit pour stopper sa séquence ou la supprimer." },
  { path: "/app/prospects", href: "/app/prospects?recherche=tous", target: "table", title: "5. Le tableau de suivi", text: "Priorité, angle commercial, coordonnées T / E / L au clic, notes et prochaine relance de chaque prospect. « Lancer la séquence » envoie l'email J0 à tous en un clic." },
  { path: "/app/prospects", target: "fab", title: "6. Noter un appel", text: "Ce bouton sert à noter un appel passé depuis votre portable : choisissez le prospect, tapez vos notes, la fiche se met à jour." },
  { path: "/app/sequences", target: "sequences", title: "7. Vos séquences", text: "Préparez ici vos emails (J0 puis relances espacées automatiquement) et vos messages LinkedIn. Vous les lancez ensuite depuis Prospects." },
  { path: "/app/tableau-de-bord", target: "stats", title: "8. Vos résultats", text: "Taux de réponse, rendez-vous, temps passé au téléphone. Le manager voit aussi les chiffres de chaque commercial, et reçoit le rapport du lundi." },
  { target: "guide", title: "C'est parti !", text: "Vous pouvez relancer ce guide à tout moment avec « ? Guide », dans le menu." },
];

const M = 16;
const PAD = 6;

export const startTour = () => window.dispatchEvent(new Event("cockpit:tour"));

export function Tour({ initialStep }: { initialStep: number | null }) {
  const path = usePathname();
  const router = useRouter();
  const [step, setStep] = useState(initialStep !== null && initialStep < STEPS.length ? initialStep : null);
  const [hole, setHole] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tipPos, setTipPos] = useState<{ top: number; left: number } | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [, start] = useTransition();
  const current = step !== null ? STEPS[step] : undefined;

  const go = useCallback((next: number | null) => {
    const n = next !== null && next >= 0 && next < STEPS.length ? next : null;
    setStep(n);
    setHole(null);
    start(() => setTourStep(n));
    const s = n !== null ? STEPS[n] : null;
    if (s?.path && (s.path !== path || (s.href && s.href !== s.path))) router.push(s.href ?? s.path);
  }, [path, router]);

  useEffect(() => {
    const begin = () => go(0);
    window.addEventListener("cockpit:tour", begin);
    return () => window.removeEventListener("cockpit:tour", begin);
  }, [go]);

  // Place le projecteur et la bulle ; attend que l'élément apparaisse après un changement de page.
  const place = useCallback(() => {
    const t = tip.current;
    if (!current || !t) return;
    const vw = window.innerWidth, vh = window.innerHeight, tw = t.offsetWidth, th = t.offsetHeight;
    const el = current.target ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`) : null;
    const r = el?.getBoundingClientRect();
    if (!r || !r.width || !r.height) {
      setHole(null);
      setTipPos({ top: Math.max(M, (vh - th) / 2), left: Math.max(M, (vw - tw) / 2) });
      return;
    }
    const box = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: Math.min(r.height + PAD * 2, vh - 2 * M) };
    setHole(box);
    let top: number, left: number;
    if (box.height > vh * 0.55) { top = vh - th - M; left = (vw - tw) / 2; }
    else if (box.left + box.width + 12 + tw <= vw - M && box.width < vw * 0.5) { left = box.left + box.width + 12; top = box.top; }
    else if (box.top + box.height + 12 + th <= vh - M) { top = box.top + box.height + 12; left = box.left; }
    else if (box.top - 12 - th >= M) { top = box.top - 12 - th; left = box.left; }
    else { top = vh - th - M; left = (vw - tw) / 2; }
    setTipPos({ top: Math.max(M, Math.min(top, vh - th - M)), left: Math.max(M, Math.min(left, vw - tw - M)) });
  }, [current]);

  useLayoutEffect(() => {
    if (!current) return;
    let tries = 0;
    const find = () => {
      const el = current.target ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`) : null;
      const onPage = !current.path || current.path === path;
      if (el && onPage) {
        const r = el.getBoundingClientRect();
        if (r.height < window.innerHeight * 0.55) el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
        else el.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
        requestAnimationFrame(place);
      } else if (tries++ < 25) timer = window.setTimeout(find, 150);
      else place();
    };
    let timer = window.setTimeout(find, 0);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [current, path, place]);

  useEffect(() => {
    if (!current) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && go(null);
    window.addEventListener("keydown", key);
    tip.current?.querySelector<HTMLButtonElement>("[data-next]")?.focus();
    return () => window.removeEventListener("keydown", key);
  }, [current, go]);

  if (!current || step === null) return null;
  const last = step === STEPS.length - 1;
  return (
    <>
      <div className="tour-catch" />
      <div className={`tour-hole${hole ? "" : " center"}`} style={hole ?? { top: "50%", left: "50%" }} />
      <div ref={tip} className="tour-tip" role="dialog" aria-labelledby="tour-t" style={tipPos ?? { visibility: "hidden" }}>
        <div className="tour-bar"><i style={{ width: `${Math.round(((step + 1) / STEPS.length) * 100)}%` }} /></div>
        <h3 id="tour-t">{current.title}</h3>
        <p>{current.text}</p>
        <div className="tour-foot">
          <span className="tour-n">{step + 1} / {STEPS.length}</span>
          <div className="inline">
            {!last && <button type="button" className="btn sm ghost" onClick={() => go(null)}>Passer</button>}
            {step > 0 && <button type="button" className="btn sm" onClick={() => go(step - 1)}>Précédent</button>}
            <button type="button" className="btn sm primary" data-next onClick={() => go(last ? null : step + 1)}>{last ? "Terminer" : step === 0 ? "Commencer" : "Suivant"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

// « ? Guide » dans le menu : relance le guide depuis n'importe quelle page.
export function GuideButton() {
  return <button type="button" className="guide-btn" data-tour="guide" onClick={startTour}>? Guide</button>;
}
