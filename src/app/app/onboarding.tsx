import Link from "next/link";
import { db } from "@/lib/db";
import { hideOnboarding } from "./parametres/actions";

// Checklist de démarrage : du compte vide au premier email envoyé. Disparaît une fois tout fait, ou masquée.
export async function Onboarding({ userId, organizationId }: { userId: string; organizationId: string }) {
  const [mailbox, search, prospects, sent] = await Promise.all([
    db.mailAccount.findUnique({ where: { userId }, select: { id: true } }),
    db.search.findFirst({ where: { organizationId }, orderBy: { createdAt: "asc" }, select: { id: true } }),
    db.prospect.count({ where: { organizationId } }),
    db.mailMessage.count({ where: { organizationId, direction: "out" } }),
  ]);
  const steps = [
    { done: !!mailbox, t: "Connecter ma boîte mail", d: "Gmail ou Outlook : vos emails partent de votre adresse.", href: "/app/parametres", cta: "Connecter" },
    { done: !!search, t: "Créer ma première recherche", d: "Votre cible en 2 minutes : zone, secteur, taille, fonctions visées.", href: "/app/recherches/nouvelle", cta: "Créer" },
    { done: prospects > 0, t: "Trouver mes prospects", d: "« Lancer la recherche de prospects » remplit votre bibliothèque avec de vraies entreprises.", href: search ? `/app/recherches/${search.id}` : "/app/recherches/nouvelle", cta: "Trouver" },
    { done: sent > 0, t: "Lancer ma séquence", d: "Un clic envoie l'email J0 à tous vos prospects ; les relances suivent.", href: search ? `/app/prospects?recherche=${search.id}` : "/app/prospects", cta: "Lancer" },
  ];
  const left = steps.filter((s) => !s.done).length;
  if (!left) return null;
  const next = steps.findIndex((s) => !s.done);
  return (
    <section className="panel onboarding" aria-label="Démarrage">
      <div className="panel-head">
        <h2>Démarrez en 4 étapes</h2>
        <span className="label">{steps.length - left} / {steps.length} · premier email en moins de 10 minutes</span>
      </div>
      <ol className="ob-steps">
        {steps.map((s, i) => (
          <li key={s.t} className={s.done ? "done" : i === next ? "next" : undefined}>
            <span className="ob-n">{s.done ? "✓" : i + 1}</span>
            <div><b>{s.t}</b><p className="muted small">{s.d}</p></div>
            {!s.done && <Link className={`btn sm${i === next ? " primary" : ""}`} href={s.href}>{s.cta}</Link>}
          </li>
        ))}
      </ol>
      <form action={hideOnboarding}><button className="btn sm ghost" type="submit">Masquer</button></form>
    </section>
  );
}
