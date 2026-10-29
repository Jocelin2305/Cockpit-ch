import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireReseller } from "@/lib/auth";
import { BrandForm } from "@/components/brand-form";
import { saveMyBrand } from "../actions";

export const metadata: Metadata = { title: "Personnalisation de l'application" };

// Onglet « Personnalisation de l'APP », débloqué par le fondateur (marque blanche).
export default async function MyBrandPage() {
  const { reseller: r } = await requireReseller();
  if (!r.whiteLabel) redirect("/super-admin/affilie");
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">Marque blanche</span>
          <h1>Personnalisation de l&apos;application</h1>
          <p className="muted">Vos clients et les visiteurs de votre lien d&apos;inscription voient votre marque.</p>
        </div>
      </header>
      <section className="panel">
        <BrandForm action={saveMyBrand} initial={r} />
      </section>
    </div>
  );
}
