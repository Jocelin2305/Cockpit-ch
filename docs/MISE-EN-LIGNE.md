# Mise en ligne de Cockpit'ch

Trois services, tous avec une offre gratuite pour démarrer :
- **Supabase** : la base de données ;
- **GitHub** : le code ;
- **Vercel** : l'hébergement, qui donne l'adresse internet.

Les clés et mots de passe se collent uniquement dans `.env` (sur le PC) et dans Vercel, jamais dans une conversation.

## 1. Supabase : deux bases (développement et production)

1. Créez un compte sur supabase.com, puis **New project** :
   - nom `cockpitch-dev` ;
   - région **Paris (eu-west-3)** : les données restent en France, ce qui simplifie le RGPD ;
   - un mot de passe de base fort, à garder dans un gestionnaire de mots de passe.
2. Recommencez avec `cockpitch-prod`.
3. Dans chaque projet : bouton **Connect** (en haut), onglet **ORMs → Prisma**. Supabase affiche deux adresses :
   - `DATABASE_URL` : port 6543, se termine par `?pgbouncer=true` ;
   - `DIRECT_URL` : port 5432.
4. Collez les adresses de **cockpitch-dev** dans `.env` (lignes `DATABASE_URL` et `DIRECT_URL`), en remplaçant `[YOUR-PASSWORD]` par le mot de passe de la base.

Prévenez-moi ensuite : je crée les tables et je relance l'application en local. La base de démo SQLite reste sur le PC dans `prisma/dev.db`, mais elle n'est pas transférée : on repart d'une base propre.

## 2. GitHub : déposer le code

1. Créez un compte sur github.com, puis un dépôt **privé** vide nommé `cockpitch`.
2. Donnez-moi l'adresse du dépôt (`https://github.com/<votre-compte>/cockpitch.git`). J'y envoie le code. Une fenêtre GitHub vous demandera de vous connecter, une seule fois.

Le fichier `.env` n'est jamais envoyé : il est exclu par `.gitignore`.

## 3. Vercel : mettre en ligne

1. Créez un compte sur vercel.com **avec GitHub**, puis **Add New → Project** et importez `cockpitch`.
2. Avant **Deploy**, ouvrez **Environment Variables** et ajoutez :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | adresse port 6543 de **cockpitch-prod** |
| `DIRECT_URL` | adresse port 5432 de **cockpitch-prod** |
| `APP_URL` | l'adresse du site, par exemple `https://cockpitch.vercel.app` (à corriger après le premier déploiement si besoin) |
| `SUPER_ADMIN_EMAILS` | votre email de fondateur |
| `TOKEN_ENCRYPTION_KEY` | une nouvelle clé, propre à la production (je vous donne la commande pour la générer) |

3. Cliquez sur **Deploy**. À chaque déploiement, les tables de la base de production sont mises à jour automatiquement (script `vercel-build`).
4. Ouvrez l'adresse du site, puis **Créer un espace** avec votre email de fondateur : vous êtes super admin.

## 4. Plus tard, au fil des besoins

Chaque variable s'ajoute dans Vercel (Settings → Environment Variables), puis on redéploie.

| Fonction | Variables | Quand |
|---|---|---|
| IA (assistant, angles, comptes rendus) | `ANTHROPIC_API_KEY` | avant la bêta |
| Paiement | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_EQUIPE` | avant les premiers clients payants |
| Gmail / Outlook | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | quand on branche la messagerie |
| Emails de la plateforme (invitations, mot de passe oublié) | `RESEND_API_KEY`, `EMAIL_FROM` (compte resend.com + domaine vérifié) | avant la bêta |
| Relances automatiques et rapport du lundi | `CRON_SECRET` (une longue valeur aléatoire ; les tâches sont déclarées dans `vercel.json`) | à la mise en ligne |
| Modèle des tâches simples (facultatif, Claude Haiku 5.5 par défaut) | `ANTHROPIC_MODEL_LIGHT` | seulement pour en changer |
| Nom de domaine | dans Vercel : Settings → Domains (par exemple `app.cockpitch.fr`), puis mettre à jour `APP_URL` | quand vous voulez |

## Avant le lancement commercial

- [ ] Prix définitifs des offres (`src/lib/plans.ts`).
- [ ] Compléter l'identité de la société dans `src/lib/legal.ts` (raison sociale, SIREN, adresse, TVA), puis faire relire les pages Mentions légales, CGU/CGV et Confidentialité par un juriste ; préparer le contrat de sous-traitance (DPA) pour les clients.
- [x] Validation Google (Gmail) : pas nécessaire pour le lancement (clients onboardés, Outlook sans audit, Gmail en mode test ou via l'administrateur Workspace). À réaborder seulement si besoin.
- [ ] Programme revendeurs : rédiger le contrat partenaire (formules, engagement 1 an « Zéro risque », commission sur le CA HT encaissé, modalités et date de versement, auto-facturation ou facture du revendeur). Créer dans Stripe l'abonnement partenaire 20 € / mois et le paiement unique de 497 € (onboarding complet) : aujourd'hui l'appli suit les revendeurs et calcule les commissions, mais ne les facture pas encore. Les commissions se versent par virement, à partir de l'IBAN visible dans la fiche du revendeur.
- [ ] Stripe pour les distributeurs : abonnements des offres A, B, C (mensuel et annuel), option support prioritaire (+15 €/mois), marque blanche 997 € (en 1 ou 3 fois). Aujourd'hui le choix est enregistré et le fondateur active l'offre à réception du paiement.
