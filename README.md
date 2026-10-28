# Cockpit Prospection

Application SaaS de prospection B2B : recherches, séquences email et LinkedIn, appels et suivi, avec un assistant IA.
Le prototype fonctionnel qui sert de cahier des charges est dans `docs/prototype-cockpit.html`, et le plan de lancement dans `docs/LANCEMENT.md`.

## Lancer l'application en local

```
npm install
npm run db:migrate
npm run dev
```

Puis ouvrir http://localhost:3000. Copier `.env.example` en `.env` lors d'une première installation.

## Ce qui est en place (sprint 1 : le socle)

- Inscription : chaque inscription crée une entreprise cliente dont l'inscrit est administrateur.
- Connexion par email et mot de passe, sessions sécurisées (cookie httpOnly, jeton stocké sous forme d'empreinte).
- Rôles par entreprise : **Administrateur** (équipe, paramètres) et **Commercial**.
- Invitations par lien (valable 7 jours), changement de rôle, retrait d'un membre ; une entreprise garde toujours au moins un administrateur.
- Espace **super admin** (`/super-admin`) : toutes les entreprises et tous les utilisateurs. L'accès est réservé aux emails listés dans `SUPER_ADMIN_EMAILS`.
- Isolation : chaque requête est filtrée sur l'entreprise de la session.

## Architecture

- Next.js 16 (App Router, actions serveur), TypeScript.
- Prisma : SQLite en local, PostgreSQL (Supabase) en production.
- `src/lib/auth.ts` : sessions, rôles et contrôles d'accès (`requireMember`, `requireAdmin`, `requireSuperAdmin`).

## Suite

- Sprint 2 : le Cockpit (espace de travail IA, recherches, prospects, séquences, appels).
- Sprint 3 : facturation Stripe.
- Avant la mise en ligne : passage sur Supabase (PostgreSQL), emails d'invitation et de mot de passe oublié, limitation des tentatives de connexion.
