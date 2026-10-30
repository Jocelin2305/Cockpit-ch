// Génère src/app/landing-html.ts à partir de la page d'accueil (src/landing/index.html, déjà branchée sur l'appli).
// Usage : node scripts/build-landing.mjs
import { readFileSync, writeFileSync } from "node:fs";

let html = readFileSync("src/landing/index.html", "utf8");
const rep = (a, b) => {
  if (!html.includes(a)) throw new Error(`Introuvable dans la page d'accueil : ${a.slice(0, 80)}`);
  html = html.split(a).join(b);
};

rep("<title>Cockpit'ch</title>", `<title>Cockpit'ch · le cockpit de prospection B2B</title>
<meta name="description" content="Vos commerciaux vendent, Cockpit'ch prospecte : ciblage, fiches, séquences email, LinkedIn et appel, priorités et suivi dans un seul outil.">
<link rel="icon" href="/icon.svg" type="image/svg+xml">`);

writeFileSync("src/app/landing-html.ts", `// Page d'accueil publique : générée par scripts/build-landing.mjs à partir de src/landing/index.html. Ne pas modifier à la main.\nexport const LANDING_HTML = ${JSON.stringify(html)};\n`);
console.log("Page d'accueil générée :", html.length, "caractères");
