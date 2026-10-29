// Génère src/app/landing-html.ts à partir de la page de vente (src/landing/index.html), branchée sur l'appli :
// connexion, inscription (avec code partenaire), test des 5 leads par l'IA de Cockpit'ch, mentions légales.
// Usage : node scripts/build-landing.mjs
import { readFileSync, writeFileSync } from "node:fs";

let html = readFileSync("src/landing/index.html", "utf8");
const rep = (a, b) => {
  if (!html.includes(a)) throw new Error(`Introuvable dans la page de vente : ${a.slice(0, 80)}`);
  html = html.split(a).join(b);
};

rep("<title>Cockpit'ch</title>", `<title>Cockpit'ch · le cockpit de prospection B2B</title>
<meta name="description" content="Cockpit'ch cible vos prospects, rédige les fiches et les séquences email, LinkedIn et appel, puis classe chaque lead par priorité.">
<link rel="icon" href="/icon.svg" type="image/svg+xml">`);
rep(`href="https://claude.ai/artifact/2AQpD8jNiNYdAcePFXyHMZ#importer" target="_blank" rel="noopener">Ouvrir Cockpit'ch →</a>`, `href="/inscription">Créer mon espace →</a>`);
rep(`<b id="handoff-title">Lancez le test dans Cockpit'ch</b>`, `<b id="handoff-title">Passez à la version complète</b>`);
rep(`Vos 5 leads sont copiés en un clic et Cockpit'ch s'ouvre sur l'import : collez-les (Ctrl+V), puis cliquez sur « Importer ».`, `Créez votre espace (14 jours gratuits) : vos 5 leads sont copiés en un clic, collez-les dans Prospects → Importer, ou lancez la recherche automatique sur votre marché.`);
rep(`La version complète de Cockpit'ch va chercher les données réelles de chaque entreprise.`, `La version complète de Cockpit'ch va chercher les entreprises réelles de votre marché dans le registre national, et leurs contacts.`);

// Inscription : formulaire classique de l'appli, code affilié transmis ; partenaire : prise de rendez-vous.
rep(`  const DEMO_APP_URL = "https://claude.ai/artifact/2AQpD8jNiNYdAcePFXyHMZ#prospects";`, `  const DEMO_APP_URL = "/inscription";`);
rep(`    cl.href = formUrl(FORM_CLASSIQUE_URL, code) || DEMO_APP_URL;
    if (!FORM_CLASSIQUE_URL) {
      cl.textContent = "Accéder à Cockpit'ch →";
      document.getElementById("reg-note-classique").textContent = "Cockpit'ch s'ouvre dans un nouvel onglet.";
    }`, `    cl.href = DEMO_APP_URL + (code ? "?partenaire=" + encodeURIComponent(code.toLowerCase()) : "");
    cl.removeAttribute("target");
    cl.textContent = "Créer mon espace →";
    document.getElementById("reg-note-classique").textContent = code ? "Avec un code partenaire, votre premier mois est offert." : "14 jours gratuits, sans carte bancaire.";`);
rep(`  document.getElementById("reg-aff-field").hidden = !FORM_AFF_ENTRY;`, `  document.getElementById("reg-aff-field").hidden = false;`);
rep(`<p>Quelques informations pour préparer votre espace, puis vous accédez directement à l'application.</p>`, `<p>Créez votre espace : vous accédez directement à l'application.</p>`);

// Chiffre fixe : il se met à jour à la main, pas tout seul.
rep(`  function tickRdv() { rdvEl.textContent = String(RDV_BASE + Math.max(0, Math.floor((Date.now() - RDV_START) / RDV_STEP))); }
  tickRdv(); setInterval(tickRdv, 60000);`, `  function tickRdv() { rdvEl.textContent = String(RDV_BASE); }
  tickRdv(); void RDV_START; void RDV_STEP;`);
rep(`<span class="tick"><i></i>Compteur mis à jour en continu</span>`, ``);

// Leads copiés au format d'import de l'appli (CSV).
rep(`    const text = JSON.stringify(appPayload(), null, 1);`, `    const q = (v) => { const s = String(v == null ? "" : v); return /[";\\n\\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const cols = [["company", "Entreprise"], ["contactRole", "Fonction"], ["priority", "Priorité"], ["status", "Statut"], ["signals", "Signaux d'achat"], ["angle", "Angle commercial"], ["notes", "Notes"]];
    const text = [cols.map((c) => c[1]).join(";")].concat(appPayload().map((r) => cols.map((c) => q(r[c[0]])).join(";"))).join("\\n");`);
rep(`() => setStatus("Leads copiés. Collez-les dans Cockpit'ch (Ctrl+V), puis « Importer »."),`, `() => setStatus("Leads copiés : après l'inscription, collez-les dans Prospects → Importer."),`);

// Test en direct : l'IA de Cockpit'ch (route /api/essai) à la place de celle du compte Claude du visiteur.
rep(`(window.claude && window.claude.use ? window.claude.use("sample") : Promise.resolve(null)).then(s => {`, `fetch("/api/essai").then(r => r.json()).then(j => j && j.enabled ? {
    json: (offer, leads, signal) => fetch("/api/essai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offer, leads }), signal })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw { code: j.code || "upstream_error" }; return j.data; })
  } : null).then(s => {`);
rep(`      const data = await sample.json(prompt, { signal: ctl.signal });`, `      void prompt;
      const data = await sample.json(offer, leads, ctl.signal);`);
rep(`      const code = e && e.code;`, `      const code = e && (e.name === "AbortError" ? "cancelled" : e.code);`);
rep(`    rate_limited: "Trop de demandes d'un coup. Réessayez dans une minute.",`, `    rate_limited: "Vous avez déjà fait plusieurs tests aujourd'hui : créez votre espace pour continuer.",`);

// Mentions obligatoires d'un site public.
rep(`  <div class="wrap">Cockpit'ch · Le cockpit de prospection B2B</div>`, `  <div class="wrap">Cockpit'ch · Le cockpit de prospection B2B · <a href="/mentions-legales">Mentions légales</a> · <a href="/cgu">CGU</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/connexion">Se connecter</a></div>`);

writeFileSync("src/app/landing-html.ts", `// Page d'accueil publique : générée par scripts/build-landing.mjs à partir de src/landing/index.html. Ne pas modifier à la main.\nexport const LANDING_HTML = ${JSON.stringify(html)};\n`);
console.log("Page d'accueil générée :", html.length, "caractères");
