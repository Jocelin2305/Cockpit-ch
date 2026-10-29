import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { MessageForm } from "../forms";

export const metadata: Metadata = { title: "Communications" };

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function Page() {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const messages = await db.resellerMessage.findMany({ orderBy: { createdAt: "desc" }, take: 30 });

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">Partenaires</span>
          <h1>Communications</h1>
        </div>
      </header>
      <section className="panel">
        <p className="muted small">Votre message s&apos;affiche dans l&apos;Espace affilié de tous les revendeurs actifs, et part par email si la case est cochée.</p>
        <MessageForm />
        {messages.length > 0 && (
          <ul className="list">
            {messages.map((m) => <li key={m.id}><b>{m.subject}</b> <span className="muted small">· {fmt(m.createdAt)}{m.emailed ? ` · ${m.emailed} email${m.emailed > 1 ? "s" : ""}` : ""}</span></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
