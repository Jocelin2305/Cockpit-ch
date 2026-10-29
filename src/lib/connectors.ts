// Connecteurs de Paramètres : catégories (facultatives ou obligatoires) et logiciels de chacune.
// `soon` : affiché, mais pas encore branché dans Cockpit'ch.
type Tool = { id: string; name: string; soon?: boolean; recommended?: boolean };
type Category = { id: string; label: string; desc: string; required: boolean; admin: boolean; tools: Tool[] };

export const CONNECTOR_CATEGORIES: Category[] = [
  { id: "ia", label: "API IA", required: true, admin: true, desc: "Le moteur du Copilote : angles, séquences, comptes rendus d'appels.", tools: [{ id: "claude", name: "Claude", recommended: true }, { id: "chatgpt", name: "ChatGPT", soon: true }, { id: "gemini", name: "Gemini", soon: true }] },
  { id: "enrichissement", label: "Enrichissement", required: true, admin: true, desc: "Emails, téléphones, LinkedIn et postes des contacts de vos recherches.", tools: [{ id: "apollo", name: "Apollo" }, { id: "lemlist", name: "Lemlist", soon: true }, { id: "lusha", name: "Lusha", soon: true }] },
  { id: "mailing", label: "Mail", required: false, admin: false, desc: "Envoyez vos séquences depuis votre propre boîte et récupérez les réponses.", tools: [{ id: "gmail", name: "Gmail" }, { id: "outlook", name: "Outlook" }] },
  { id: "crm", label: "CRM", required: false, admin: true, desc: "Envoyez vos prospects et leur avancement dans votre CRM en un clic.", tools: [{ id: "pipedrive", name: "Pipedrive" }, { id: "hubspot", name: "HubSpot" }, { id: "nethunt", name: "NetHunt", soon: true }] },
  { id: "voip", label: "Voice IP", required: false, admin: true, desc: "Appels en un clic, rattachés au bon prospect, avec compte rendu automatique.", tools: [{ id: "ringover", name: "Ringover" }, { id: "aircall", name: "Aircall" }] },
  { id: "automatisation", label: "Automatisation", required: false, admin: true, desc: "Faites partir vos campagnes depuis votre outil d'emailing.", tools: [{ id: "brevo", name: "Brevo", soon: true }, { id: "lemlist", name: "Lemlist", soon: true }] },
];

export const connectorCategory = (id: string) => CONNECTOR_CATEGORIES.find((c) => c.id === id);
export const CONNECTORS_PATH = "/app/parametres/connecteurs";
