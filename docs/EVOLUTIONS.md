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

## Sprint 10 : commercialisation

| # | Demande | Statut |
|---|---|---|
| 1 | Page d'accueil publique (promesse, fonctionnement, tarifs, partenaires, FAQ, démo, prise de rendez-vous) | Fait (`/`) |
| 2 | Rapport hebdomadaire au gestionnaire | Fait : email chaque lundi (Resend), page `/app/rapport`, envoi à la demande, réglage dans Paramètres |
| 3 | Relances envoyées automatiquement | Fait : option par utilisateur, chaque matin de semaine (CRON_SECRET) |
| 4 | Lien de désinscription et liste d'opposition | Fait : lien signé dans chaque email, page `/desinscription`, adresses bloquées |
| 5 | Démo « Essayez sur votre marché » | Fait : vraie recherche dans le registre, 3 par démo |
| 6 | Checklist de démarrage en 4 étapes | Fait (Espace de travail, administrateurs) |
| 7 | Cas client chiffré (Ryo) | En attente des chiffres |

## Sprint 11 : simplification

| # | Demande | Statut |
|---|---|---|
| 1 | Stopper ou supprimer une séquence par clic droit | Fait : clic droit sur une ligne de prospect, une bibliothèque ou une séquence (stopper, reprendre, supprimer) |
| 2 | Supprimer une bibliothèque de prospects | Fait (clic droit, avec ses prospects, après confirmation) |
| 3 | Guide pas à pas de l'appli au style de la page d'accueil | Fait (checklist de démarrage en cartes numérotées) |
| 4 | Supprimer l'espace démo : l'essai se fait sur Cockpit'ch classique | Fait : `/demo` supprimé, liens de la page d'accueil vers l'essai gratuit, statistiques d'essais dans le super admin |
| 5 | L'essai devient abonnement sur le même compte | Déjà le cas : le paiement démarre sur l'espace d'essai, rien n'est recréé |

## Sprint 12 : tableau, Paramètres, recherche, offres distributeurs, marque blanche, coût de l'IA

| # | Demande | Statut |
|---|---|---|
| 1 | Supprimer « Guide interactif » du Centre d'aide | Fait (infobulles retirées, Guide d'utilisation partout) |
| 2 | Soleil / lune en haut à droite | Fait, tous les comptes |
| 3 | Paramètres : signature, entreprise, abonnement en cours, vignettes de connecteurs Obligatoire / Facultatif | Fait. Branchés : Claude (clé par entreprise), Apollo, Gmail, Outlook, HubSpot, Pipedrive, Ringover, Aircall. Bientôt : ChatGPT, Gemini, Lemlist, Lusha, NetHunt, Brevo |
| 4 | Formulaire de recherche sans doublons, listes déroulantes, sans étape « séquence » | Fait (5 étapes) |
| 5 | Tableau : ordre stable, barre de tri, email / téléphone / LinkedIn affichés, Enrichir, email cliquable (séquence), téléphone cliquable (appel), Dernière interaction, note sous l'entreprise | Fait |
| 6 | Réduire les jetons IA | Fait : fiches plafonnées, historique du Copilote limité, résultats d'outils allégés, modèle léger réglable (ANTHROPIC_MODEL_LIGHT) |
| 7 | Offres distributeurs A / B / C, options, commissions 15 / 5 / 0 %, support, demandes de fonctionnalité | Fait ; paiement Stripe à brancher |
| 8 | Marque blanche : onglet Personnalisation débloqué par le fondateur, roue chromatique, logo, nom, typographie ; lien affilié brandé ; support = email du distributeur | Fait |

Décisions ouvertes (spécification distributeurs) : essai de 14 jours ou garantie 30 jours ; commission maintenue avec l'option marque blanche (oui par défaut) ; plafond de tickets de l'offre A ; minimum de commission par client actif (désactivé).
