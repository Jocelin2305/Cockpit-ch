import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { BrandForm } from "@/components/brand-form";
import { saveResellerBrand } from "../../actions";

export const metadata: Metadata = { title: "Personnalisation de l'APP" };

// Le fondateur peut régler le pack de marque d'un distributeur à sa place.
export default async function ResellerBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const r = await db.reseller.findUnique({ where: { id: (await params).id } });
  if (!r) notFound();
  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">Marque blanche · {r.companyName || r.email}</span>
          <h1>Personnalisation de l&apos;APP</h1>
          {!r.whiteLabel && <p className="alert">La marque blanche n&apos;est pas débloquée pour ce distributeur : elle ne s&apos;affichera qu&apos;une fois débloquée.</p>}
        </div>
      </header>
      <section className="panel"><BrandForm action={saveResellerBrand} initial={r} resellerId={r.id} /></section>
    </div>
  );
}
