import Link from "next/link";
import { Brand } from "@/components/brand";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="legal">
      <Link href="/" className="auth-brand" aria-label="Accueil"><Brand /></Link>
      <article className="legal-body">{children}</article>
      <p className="auth-foot"><Link href="/mentions-legales">Mentions légales</Link> · <Link href="/cgu">Conditions d&apos;utilisation</Link> · <Link href="/confidentialite">Confidentialité</Link></p>
    </main>
  );
}
