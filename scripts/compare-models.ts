// Comparatif Opus 5.5 / Haiku 5.5 sur les vraies fonctions IA de Cockpit'ch, avec les données de test locales.
// Usage : npx tsx scripts/compare-models.ts   (clé ANTHROPIC_API_KEY dans .env ; coût total de quelques centimes)
// Produit docs/comparatif-ia.md. Les angles des 3 prospects testés sont remis comme avant à la fin.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const MODELS = ["claude-opus-5-5", "claude-haiku-5-5"];
const ORG = "Démo Conseil";
const TRANSCRIPT = `Commercial : Bonjour Madame Martin, je vous appelle au sujet de la planification des équipes soignantes.
Prospect : Oui, c'est un vrai sujet chez nous, on gère encore tout sur Excel et on a eu trois absences non remplacées le mois dernier.
Commercial : Combien de soignants planifiez-vous ?
Prospect : Environ 120, sur deux sites. Le budget se décide avec le directeur en janvier. Rappelez-moi la semaine du 15 décembre, je verrai avec lui.
Commercial : Très bien, je vous envoie une présentation d'ici là.`;

type Run = { model: string; angles: { company: string; angle: string; detail: string }[]; call: unknown; ciblage: string; usage: Record<string, { i: number; o: number }>; ms: Record<string, number> };

async function runOne(model: string): Promise<Run> {
  const { db } = await import("../src/lib/db");
  const { generateAnglesFor, analyzeCallNotes, analyzeSearch } = await import("../src/lib/ai-features");
  const org = await db.organization.findFirstOrThrow({ where: { name: ORG } });
  const ctx = { organizationId: org.id, userId: null };
  const prospects = await db.prospect.findMany({ where: { organizationId: org.id, searchId: { not: null } }, orderBy: { createdAt: "asc" }, take: 3 });
  const saved = prospects.map((p) => ({ id: p.id, angle: p.angle, angleDetail: p.angleDetail }));
  const since = new Date();
  const ms: Record<string, number> = {};
  const time = async <T>(k: string, f: () => Promise<T>) => { const t = Date.now(); const r = await f(); ms[k] = Date.now() - t; return r; };
  try {
    await db.prospect.updateMany({ where: { id: { in: saved.map((p) => p.id) } }, data: { angle: "", angleDetail: "" } });
    await time("angles", async () => { for (const p of prospects) await generateAnglesFor(ctx, { prospectId: p.id }); });
    const after = await db.prospect.findMany({ where: { id: { in: saved.map((p) => p.id) } } });
    const call = await time("appel", () => analyzeCallNotes(ctx, prospects[0], TRANSCRIPT, ["Budget", "Autorité", "Besoin", "Délai"]));
    const ciblage = await time("ciblage", () => analyzeSearch(ctx, prospects[0].searchId!, "ciblage"));
    const rows = await db.aiUsage.findMany({ where: { organizationId: org.id, createdAt: { gte: since } } });
    const usage: Run["usage"] = {};
    for (const r of rows) { const u = (usage[r.feature] ??= { i: 0, o: 0 }); u.i += r.inputTokens; u.o += r.outputTokens; }
    return { model, angles: after.map((p) => ({ company: p.company, angle: p.angle, detail: p.angleDetail })), call, ciblage, usage, ms };
  } finally {
    for (const p of saved) await db.prospect.update({ where: { id: p.id }, data: { angle: p.angle, angleDetail: p.angleDetail } });
    await db.$disconnect();
  }
}

const PRICE: Record<string, [number, number]> = { "claude-opus-5-5": [4, 20], "claude-haiku-5-5": [0.1, 0.5] };
const cost = (model: string, u: { i: number; o: number }) => (u.i * PRICE[model][0] + u.o * PRICE[model][1]) / 1e6;

if (process.env.COMPARE_MODEL) {
  // Un processus par modèle : le modèle « léger » est lu au chargement de l'appli.
  const r = await runOne(process.env.COMPARE_MODEL);
  process.stdout.write(`@@RESULT@@${JSON.stringify(r)}`);
} else {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Ajoutez ANTHROPIC_API_KEY dans .env avant de lancer le comparatif.");
  const runs: Run[] = MODELS.map((model) => {
    const out = execFileSync(process.execPath, [...process.execArgv, process.argv[1]], { env: { ...process.env, COMPARE_MODEL: model, ANTHROPIC_MODEL_LIGHT: model }, encoding: "utf8", maxBuffer: 50e6 });
    return JSON.parse(out.split("@@RESULT@@")[1]);
  });
  const md: string[] = ["# Comparatif Opus 5.5 / Haiku 5.5", "", `Généré le ${new Date().toLocaleString("fr-FR")} sur les données de test (« ${ORG} »).`, "", "## Coût et durée", "", "| Tâche | " + MODELS.join(" | ") + " |", "|---|" + MODELS.map(() => "---|").join("")];
  for (const k of ["angles", "appel", "ciblage"]) md.push(`| ${k} | ${runs.map((r) => `${(cost(r.model, r.usage[k] ?? { i: 0, o: 0 }) * 100).toFixed(3)} centimes · ${((r.ms[k] ?? 0) / 1000).toFixed(1)} s`).join(" | ")} |`);
  md.push("", "## Angles et argumentaires");
  runs[0].angles.forEach((a, i) => {
    md.push("", `### ${a.company}`);
    for (const r of runs) md.push("", `**${r.model}** : ${r.angles[i]?.angle}`, "", `> ${r.angles[i]?.detail}`);
  });
  md.push("", "## Compte rendu d'appel");
  for (const r of runs) md.push("", `**${r.model}**`, "", "```json", JSON.stringify(r.call, null, 2), "```");
  md.push("", "## Analyse de ciblage");
  for (const r of runs) md.push("", `### ${r.model}`, "", r.ciblage);
  writeFileSync("docs/comparatif-ia.md", md.join("\n"));
  console.log("Rapport : docs/comparatif-ia.md");
}
