import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";
import { db } from "@/lib/db";
import { brandForCode } from "@/lib/branding";
import { Brand } from "@/components/brand";
import { BrandStyle } from "@/components/brand-style";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ partenaire?: string }> }) {
  const { partenaire } = await searchParams;
  const code = partenaire?.trim().slice(0, 20);
  const reseller = code ? await db.reseller.findFirst({ where: { code, active: true }, select: { companyName: true } }) : null;
  const brand = reseller ? await brandForCode(code) : null;
  return (
    <>
      <BrandStyle brand={brand} hideDefault />
      {brand && <div className="auth-brand-custom"><Brand brand={brand} sub="Prospection B2B" /></div>}
      <h1>Créer votre espace</h1>
      {reseller && <p className="alert ok">{brand ? "Votre premier mois est offert." : `Invitation de ${reseller.companyName || "votre partenaire"} : votre premier mois est offert.`}</p>}
      <p className="muted">Votre entreprise, vos commerciaux, vos prospects. Vous serez administrateur de l&apos;espace.</p>
      <SignupForm partner={reseller ? code : undefined} />
      <p className="muted small">
        Déjà un compte ? <Link href={brand ? `/connexion?partenaire=${code}` : "/connexion"}>Se connecter</Link>
      </p>
    </>
  );
}
