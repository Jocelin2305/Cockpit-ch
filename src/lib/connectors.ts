// Connecteurs de Paramètres : catégories facultatives et logiciels de chacune. L'IA et l'enrichissement sont fournis par la plateforme.
// `soon` : affiché, mais pas encore branché dans Cockpit'ch.
type Tool = { id: string; name: string; soon?: boolean; };
type Category = { id: string; label: string; desc: string; admin: boolean; tools: Tool[] };

export const CONNECTOR_CATEGORIES: Category[] = [
  { id: "mailing", label: "Mail", admin: false, desc: "Envoyez vos séquences depuis votre propre boîte et récupérez les réponses.", tools: [{ id: "gmail", name: "Gmail" }, { id: "outlook", name: "Outlook" }] },
  { id: "crm", label: "CRM", admin: true, desc: "Envoyez vos prospects et leur avancement dans votre CRM en un clic.", tools: [{ id: "pipedrive", name: "Pipedrive" }, { id: "hubspot", name: "HubSpot" }, { id: "nethunt", name: "NetHunt", soon: true }] },
  { id: "voip", label: "Voice IP", admin: true, desc: "Appels en un clic, rattachés au bon prospect, avec compte rendu automatique.", tools: [{ id: "ringover", name: "Ringover" }, { id: "aircall", name: "Aircall" }] },
  { id: "automatisation", label: "Automatisation", admin: true, desc: "Faites partir vos campagnes depuis votre outil d'emailing.", tools: [{ id: "brevo", name: "Brevo", soon: true }, { id: "lemlist", name: "Lemlist", soon: true }] },
];

export const connectorCategory = (id: string) => CONNECTOR_CATEGORIES.find((c) => c.id === id);
export const CONNECTORS_PATH = "/app/parametres/connecteurs";
