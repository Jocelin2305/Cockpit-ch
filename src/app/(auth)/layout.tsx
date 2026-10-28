import Link from "next/link";
import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-card">
        <Link href="/" className="auth-brand" aria-label="Accueil">
          <Brand />
        </Link>
        {children}
      </div>
      <p className="auth-foot">Vos données restent privées et isolées de celles des autres entreprises.<br /><Link href="/mentions-legales">Mentions légales</Link> · <Link href="/cgu">Conditions d&apos;utilisation</Link> · <Link href="/confidentialite">Confidentialité</Link></p>
    </main>
  );
}
