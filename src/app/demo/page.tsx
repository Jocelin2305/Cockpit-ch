import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Démo" };

// Lien à partager : /demo (option ?source=linkedin pour suivre la provenance des visiteurs).
export default async function DemoPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  const start = (guide: boolean) => `/demo/start?guide=${guide ? 1 : 0}${source ? `&source=${encodeURIComponent(source)}` : ""}`;
  return (
    <main className="auth">
      <div className="auth-card">
        <Brand />
        <h1>Découvrez Cockpit&apos;ch</h1>
        <p className="muted">Un espace de démonstration rempli de prospects fictifs, rien que pour vous. Cliquez partout : il s&apos;efface tout seul dans 24 heures.</p>
        <p><b>Est-ce la première fois que vous utilisez Cockpit&apos;ch ?</b></p>
        <div className="stack">
          <Link className="btn primary" href={start(true)}>Oui, guidez-moi pas à pas</Link>
          <Link className="btn" href={start(false)}>Non, je connais déjà</Link>
        </div>
        <p className="muted small">Aucune inscription, aucune carte bancaire.</p>
      </div>
    </main>
  );
}
