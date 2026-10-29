// Catégories de connecteurs proposées dans Paramètres → Connecteurs, et logiciels disponibles dans chacune.
export const CONNECTOR_CATEGORIES = [
  { id: "mailing", label: "Outil mailing", desc: "Envoyez vos séquences depuis votre propre boîte et récupérez les réponses.", tools: ["Gmail", "Outlook / Microsoft 365"], admin: false },
  { id: "crm", label: "CRM", desc: "Envoyez vos prospects et leur avancement dans votre CRM en un clic.", tools: ["HubSpot", "Pipedrive"], admin: true },
  { id: "voip", label: "Voix IP (téléphonie)", desc: "Chaque appel est rattaché au bon prospect, avec compte rendu automatique.", tools: ["Aircall", "Ringover", "Autre (webhook)"], admin: true },
  { id: "ia", label: "API IA", desc: "Le moteur du Copilote : angles, séquences, comptes rendus d'appels.", tools: ["Claude (Anthropic)"], admin: true },
  { id: "enrichissement", label: "Enrichissement", desc: "Emails, LinkedIn et postes des contacts de vos recherches.", tools: ["Apollo.io"], admin: true },
] as const;

export type ConnectorCategory = (typeof CONNECTOR_CATEGORIES)[number]["id"];
export const connectorCategory = (id: string) => CONNECTOR_CATEGORIES.find((c) => c.id === id);
export const CONNECTORS_PATH = "/app/parametres/connecteurs";
