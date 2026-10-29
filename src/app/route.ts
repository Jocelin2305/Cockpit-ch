import { LANDING_HTML } from "./landing-html";

// Page d'accueil publique : la page de vente Cockpit'ch (visuel d'origine), branchée sur l'appli.
export function GET() {
  return new Response(LANDING_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
