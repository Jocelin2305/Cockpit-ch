# Évolutions demandées (28 octobre 2026)

Liste des évolutions demandées par le fondateur, avec ce qui est fait dans ce sprint et ce qui attend un connecteur ou une clé.

| # | Évolution | État |
|---|---|---|
| 1 | Nom « Cockpit'ch » + logo dédié | Sprint 4 |
| 2 | « Outils » et « Compte » surlignés dans le menu ; « Compte » en menu déroulant | Sprint 4 |
| 3 | Retirer « Abonnement » du menu (déjà dans Paramètres) | Sprint 4 |
| 4 | « Centre d'aide » à la place : activer / désactiver un guide d'adoption (infobulles partout) | Sprint 4 |
| 5 | Supprimer « Profil » : la signature email passe dans « Paramètres » | Sprint 4 |
| 6 | Notes manuelles sur chaque ligne de prospect | Sprint 4 |
| 7 | Plus d'onglet « Appels » : numéros cliquables pour appeler + bouton flottant en bas à droite pour saisir un appel | Sprint 4 + sprint 6 : appels enregistrés automatiquement par Aircall, Ringover ou tout outil (webhook) |
| 8 | Infos relevées pendant l'appel et suivi mis à jour en direct | Saisie pendant l'appel + analyse IA des notes : sprint 4 (IA active avec la clé Claude). Sprint 6 : la transcription envoyée par la téléphonie met la fiche à jour automatiquement (avec la clé Claude) |
| 9 | Stats d'appels dans le Tableau de bord ; le manager voit les stats de chaque utilisateur | Sprint 4 |
| 10 | Compte fondateur = super admin ; lui seul peut donner l'accès super admin | Sprint 4 |
| 11 | Le super admin pré-paramètre les comptes clients pour les onboarder en direct | Sprint 4 (créer l'entreprise et ses utilisateurs, ouvrir son espace pour le configurer) |
| 12 | À chaque connexion / chaque matin : point complet du quotidien (emails, messagerie vocale, appels manqués, emails à faire / relancer) | Sprint 4 : briefing à partir des données de l'outil. Emails, messagerie et appels manqués : arrivent avec les connecteurs (Gmail / Outlook, téléphonie) |

## Sprint 8 : revendeurs, CRM, lancement des séquences

| # | Demande | Statut |
|---|---|---|
| 1 | Super admin revendeur : même appli, mêmes droits que le fondateur mais limités à ses clients (onboarding, paramétrage) | Fait |
| 2 | Fondateur : module « Partenaires revendeurs » (revendeurs, comptes actifs, CA, commission par revendeur, communication à tous) | Fait |
| 3 | Espace affilié : paliers de commission, formules Zéro risque (65 %) et Onboarding complet (85 %), dossier RIB / SIRET / entreprise / adresse / gérant, centre d'aide vidéos (démo, vente, onboarding) | Fait ; facturation Stripe des abonnements partenaires à venir |
| 4 | Bouton « Rechercher des prospects » au-dessus des outils | Fait |
| 5 | Prospects : rien n'est affiché avant d'ouvrir une bibliothèque | Fait |
| 6 | « Mettre à jour mon CRM », visible seulement avec un CRM connecté (HubSpot, Pipedrive) | Fait, à tester avec un vrai compte CRM |
| 7 | Lancer la séquence email en un clic depuis Prospects | Fait (email J0 à tous les prospects à contacter de la bibliothèque) |

## Sprint 9 : recherche automatique de prospects

| # | Demande | Statut |
|---|---|---|
| 1 | Lancer une recherche de prospects depuis l'appli | Fait : registre national des entreprises (gratuit), critères zone / secteur NAF / effectif / CA / mot-clé, 10 à 100 entreprises par lancement, sans doublon |
| 2 | Fichiers de prospection à jour, contacts prioritaires | Fait : priorité A / B / C calculée, « Actualiser » ajoute les nouvelles entreprises, export trié par priorité avec SIREN |
| 3 | Apollo pour enrichir les contacts (clé du client) | Fait : dirigeant puis fonction visée, email, LinkedIn, poste, site, standard ; à tester avec un vrai compte Apollo. Téléphones directs Apollo non demandés (8 crédits, livrés en différé) |
