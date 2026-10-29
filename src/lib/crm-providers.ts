// CRM proposés : sans dépendance serveur, utilisables côté navigateur.

export const CRM_PROVIDERS = { hubspot: "HubSpot", pipedrive: "Pipedrive" } as const;
export type CrmProvider = keyof typeof CRM_PROVIDERS;
export const isCrmProvider = (p: string): p is CrmProvider => p in CRM_PROVIDERS;

export const CRM_HELP: Record<CrmProvider, string> = {
  hubspot: "HubSpot : Paramètres → Intégrations → Applications privées → Créer, avec les droits « crm.objects.contacts » (lecture et écriture). Collez le jeton d'accès.",
  pipedrive: "Pipedrive : Paramètres personnels → API → copiez votre jeton d'API personnel.",
};
