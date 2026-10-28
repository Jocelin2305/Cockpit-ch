import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { callBackDue, callQueue, has, todayISO } from "@/lib/prospecting";
import { CallCard } from "./call-card";

export const metadata: Metadata = { title: "Appels" };

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ p?: string; recherche?: string }> }) {
  const { membership } = await requireMember();
  const orgId = membership.organizationId;
  const { p: currentId, recherche } = await searchParams;
  const [prospects, searches] = await Promise.all([
    db.prospect.findMany({
      where: { organizationId: orgId, status: { notIn: ["Gagné", "Perdu"] }, ...(recherche ? { searchId: recherche } : {}) },
      include: { search: { select: { name: true } } },
    }),
    db.search.findMany({ where: { organizationId: orgId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const today = todayISO();
  const queue = callQueue(prospects, today);
  const noPhone = prospects.filter((p) => !has(p.phone)).length;
  const current = queue.find((p) => p.id === currentId) ?? queue[0] ?? null;
  const idx = current ? queue.indexOf(current) : -1;
  const next = queue.slice(idx + 1).find((p) => p.lastCallAt !== today) ?? queue.find((p) => p.id !== current?.id && p.lastCallAt !== today) ?? null;
  const calls = current ? await db.call.findMany({ where: { prospectId: current.id }, orderBy: { createdAt: "desc" }, take: 10 }) : [];
  const q = (id: string) => `/app/appels?p=${id}${recherche ? `&recherche=${recherche}` : ""}`;

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <h1>Appels</h1>
          <p className="muted">La file d&apos;appels, dans l&apos;ordre. Après chaque appel, collez la transcription ou vos notes : statut, qualification et rappel se mettent à jour.</p>
        </div>
        <form method="get" className="row">
          <select className="input" name="recherche" defaultValue={recherche ?? ""} aria-label="Recherche">
            <option value="">Toutes les recherches</option>
            {searches.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn" type="submit">Filtrer</button>
        </form>
      </header>

      <div className="callgrid">
        <section className="panel callq">
          <div className="panel-head"><h2>File d&apos;appels</h2><span className="label">{queue.length} à appeler</span></div>
          <div className="list">
            {queue.length === 0 && <p className="muted">Aucun prospect avec numéro direct{recherche ? " dans cette recherche" : ""}.</p>}
            {queue.map((p, i) => (
              <Link key={p.id} href={q(p.id)} className="li" aria-current={p.id === current?.id ? "true" : undefined}>
                <div>
                  <b>{i + 1}. {p.company}</b>
                  <span className="muted small block">
                    {callBackDue(p, today) && <b className="signal">Rappel prévu · </b>}
                    {p.status}{p.lastCallAt === today ? " · appelé aujourd'hui" : ""}
                  </span>
                </div>
                <span className={`prio ${p.priority}`} />
              </Link>
            ))}
          </div>
          {noPhone > 0 && <p className="hint">{noPhone} prospect{noPhone > 1 ? "s" : ""} sans numéro direct : à enrichir.</p>}
        </section>

        {current ? (
          <CallCard
            key={current.id}
            prospect={{
              id: current.id, company: current.company, contactName: current.contactName, contactRole: current.contactRole,
              city: current.city, phone: current.phone, angle: current.angle, qualification: current.qualification,
              status: current.status, priority: current.priority, searchName: current.search?.name ?? null,
            }}
            calls={calls.map((c) => ({ id: c.id, day: c.day, issue: c.issue, resume: c.resume, interet: c.interet, next: c.next, durationMs: c.durationMs }))}
            nextHref={next ? q(next.id) : null}
            aiReady={aiEnabled()}
          />
        ) : (
          <section className="panel">
            <p className="muted">La file est vide. Ajoutez des numéros directs à vos prospects ou importez une liste.</p>
          </section>
        )}
      </div>
    </div>
  );
}
