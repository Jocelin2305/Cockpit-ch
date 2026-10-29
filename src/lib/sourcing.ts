// Recherche automatique : entreprises actives du registre national (API Recherche d'entreprises, gratuite et ouverte),
// ajoutées comme prospects dans la bibliothèque de la recherche, sans doublon.
import type { Search } from "@prisma/client";
import { appUrl } from "./auth";
import { db } from "./db";
import { priorityFor } from "./scoring";
import { codes, effectifLabel, sectionLabel } from "./sourcing-data";

const API = "https://recherche-entreprises.api.gouv.fr/search";
const PER_PAGE = 25;

export class SourcingError extends Error {}

type Place = { libelle_commune?: string; code_postal?: string; adresse?: string };
type Dirigeant = { nom?: string; prenoms?: string; qualite?: string; type_dirigeant?: string };
type Company = {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  activite_principale?: string;
  section_activite_principale?: string;
  tranche_effectif_salarie?: string;
  siege?: Place;
  // Établissements qui correspondent aux critères de zone : le plus proche de la cible, pas forcément le siège.
  matching_etablissements?: Place[];
  dirigeants?: Dirigeant[];
  finances?: Record<string, { ca?: number }>;
};

// Paramètres de l'API à partir des critères ; null si aucun critère ne permet de cibler.
export function sourcingQuery(s: Pick<Search, "srcRegion" | "srcDeps" | "srcSection" | "srcNaf" | "srcKeyword" | "srcEffectifs" | "srcCaMin" | "srcCaMax">) {
  const q = new URLSearchParams({ etat_administratif: "A", est_entrepreneur_individuel: "false", minimal: "true", include: "siege,dirigeants,finances,matching_etablissements", per_page: String(PER_PAGE) });
  const put = (k: string, v: string[]) => v.length && q.set(k, v.join(","));
  put("region", codes(s.srcRegion));
  put("departement", codes(s.srcDeps));
  put("section_activite_principale", codes(s.srcSection));
  put("activite_principale", codes(s.srcNaf));
  put("tranche_effectif_salarie", codes(s.srcEffectifs));
  if (s.srcKeyword.trim()) q.set("q", s.srcKeyword.trim());
  const ca = (v: string) => Math.round(Number(v.replace(/\s/g, "").replace(",", ".")) || 0);
  if (ca(s.srcCaMin) > 0) q.set("ca_min", String(ca(s.srcCaMin)));
  if (ca(s.srcCaMax) > 0) q.set("ca_max", String(ca(s.srcCaMax)));
  const targeted = ["region", "departement", "section_activite_principale", "activite_principale", "q"].some((k) => q.has(k));
  return targeted ? q : null;
}

async function fetchPage(q: URLSearchParams, page: number) {
  q.set("page", String(page));
  const res = await fetch(`${API}?${q}`, { headers: { "User-Agent": `Cockpitch/1.0 (+${appUrl()})`, Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (res.status === 429) throw new SourcingError("Le registre des entreprises est très sollicité : réessayez dans une minute.");
  if (res.status === 400) throw new SourcingError("Critères refusés par le registre : vérifiez les codes saisis (départements, NAF).");
  if (!res.ok) throw new SourcingError(`Le registre des entreprises ne répond pas (${res.status}). Réessayez plus tard.`);
  return (await res.json()) as { results: Company[]; total_results: number; total_pages: number };
}

const title = (s: string) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
const normName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// « NOM (SIGLE) » : on garde le nom.
const companyName = (c: Company) => title((c.nom_raison_sociale || c.nom_complet || c.siren).replace(/\s*\(.*\)\s*$/, "").trim());

// Dirigeant à contacter : une personne physique, de préférence président, gérant ou directeur général.
function leader(c: Company) {
  const people = (c.dirigeants ?? []).filter((d) => d.type_dirigeant === "personne physique" && d.nom);
  const rank = (q = "") => (/président|gérant|directeur général|dirigeant/i.test(q) ? 0 : 1);
  const d = people.sort((a, b) => rank(a.qualite) - rank(b.qualite))[0];
  if (!d) return { name: "", role: "" };
  return { name: `${title((d.prenoms ?? "").split(/\s+/)[0] ?? "")} ${(d.nom ?? "").toUpperCase()}`.trim(), role: d.qualite ?? "" };
}

function lastRevenue(c: Company) {
  const years = Object.keys(c.finances ?? {}).sort().reverse();
  const y = years.find((k) => c.finances![k]?.ca);
  if (!y) return "";
  const ca = c.finances![y].ca!;
  return `CA ${y} : ${ca >= 1e6 ? `${(ca / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M€` : `${Math.round(ca / 1000)} k€`}`;
}

// Lance (ou poursuit) la recherche : `wanted` nouvelles entreprises au plus, à partir de la page suivante.
export async function runSourcing(search: Search, wanted: number) {
  const q = sourcingQuery(search);
  if (!q) throw new SourcingError("Précisez au moins une zone (région ou départements), un secteur (section ou codes NAF) ou un mot-clé dans les critères de la recherche.");
  const known = await db.prospect.findMany({ where: { organizationId: search.organizationId }, select: { siren: true, company: true } });
  const sirens = new Set(known.map((p) => p.siren).filter(Boolean));
  const names = new Set(known.map((p) => normName(p.company)));

  let page = search.sourcedPage;
  let totalPages = Infinity;
  let total = 0;
  const found: Company[] = [];
  // 4 pages au plus par lancement (100 entreprises), en respectant la limite de 7 requêtes par seconde.
  for (let i = 0; i < 4 && found.length < wanted; i++) {
    page = page >= totalPages ? 1 : page + 1;
    const res = await fetchPage(q, page);
    totalPages = Math.max(1, res.total_pages);
    total = res.total_results;
    for (const c of res.results) {
      if (found.length >= wanted || sirens.has(c.siren) || names.has(normName(companyName(c)))) continue;
      sirens.add(c.siren);
      names.add(normName(companyName(c)));
      found.push(c);
    }
    if (page >= totalPages && i > 0) break;
  }

  const rows = found.map((c) => {
    const l = leader(c);
    const naf = c.activite_principale ?? "";
    const place = c.matching_etablissements?.[0] ?? c.siege;
    const p = {
      organizationId: search.organizationId,
      searchId: search.id,
      company: companyName(c),
      siren: c.siren,
      source: "registre",
      sector: [sectionLabel(c.section_activite_principale), naf && `NAF ${naf}`].filter(Boolean).join(" · "),
      city: [place?.code_postal, place?.libelle_commune ? title(place.libelle_commune) : ""].filter(Boolean).join(" "),
      size: effectifLabel(c.tranche_effectif_salarie),
      contactName: l.name,
      contactRole: l.role,
      notes: [`Registre des entreprises · SIREN ${c.siren}`, lastRevenue(c), place?.adresse].filter(Boolean).join(" · "),
    };
    return { ...p, priority: priorityFor({ ...p, email: "", emailVerified: false, phone: "", linkedin: "" }, search.fonctions) };
  });
  if (rows.length) await db.prospect.createMany({ data: rows, skipDuplicates: true });
  await db.search.update({ where: { id: search.id }, data: { sourcedPage: page, sourcedAt: new Date() } });
  return { added: rows.length, total };
}
