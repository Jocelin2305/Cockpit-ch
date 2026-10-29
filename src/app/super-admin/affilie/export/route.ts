import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { monthlyResale, offerById, resellerStats } from "@/lib/resellers";

// Relevé mensuel du distributeur : chaque client actif, son abonnement déclaré et la commission due.
export async function GET() {
  const session = await getSession();
  if (!session?.reseller) return new Response("Non autorisé", { status: 401 });
  const r = session.reseller;
  const orgs = await db.organization.findMany({ where: { resellerId: r.id }, orderBy: { name: "asc" } });
  const s = resellerStats(orgs, r.offer);
  const q = (v: unknown) => { const t = String(v ?? ""); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const n = (x: number) => x.toFixed(2).replace(".", ",");
  const month = new Date().toISOString().slice(0, 7);
  const lines = [
    ["Mois", "Client", "Statut", "Prix facturé HT", "Périodicité", "Équivalent mensuel HT", `Commission ${Math.round(s.rate * 100)} %`].join(";"),
    ...s.rows.map(({ org, paying, commission }) => [month, q(org.name), paying ? "actif" : "inactif", n(org.resellerPrice ?? 0), org.resellerBilling ?? "", n(monthlyResale(org)), n(commission)].join(";")),
    ["", "Total", "", "", "", n(s.ca), n(s.commission)].join(";"),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="Releve_${offerById(r.offer).id}_${month}.csv"` },
  });
}
