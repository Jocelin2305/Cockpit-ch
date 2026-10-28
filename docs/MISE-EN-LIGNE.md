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
| Nom de domaine | dans Vercel : Settings → Domains (par exemple `app.cockpitch.fr`), puis mettre à jour `APP_URL` | quand vous voulez |

## Avant le lancement commercial

- [ ] Prix définitifs des offres (`src/lib/plans.ts`).
- [ ] Mentions légales, CGV / CGU, politique de confidentialité (RGPD), contrat de sous-traitance des données pour les clients.
- [ ] Envoi des emails de la plateforme (invitations, mot de passe oublié) : un service d'envoi comme Resend ou Brevo.
- [ ] Vérification de l'application par Google, nécessaire pour lire les emails Gmail des clients (plusieurs semaines).
