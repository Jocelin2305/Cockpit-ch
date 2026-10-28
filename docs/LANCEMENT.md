# Cockpit Prospection : guide de lancement

Point de départ : le prototype `cockpit-prospection.html` (copié dans ce dossier) sert de cahier des charges. Écrans, parcours, règles (5 relances email, LinkedIn en parallèle, angle commercial, file d'appels) et consignes à l'IA sont déjà validés.

---

## Étape 1 : installer les outils (15 min)

Dans un terminal PowerShell :

```
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Microsoft.VisualStudioCode -e
```

Fermez puis rouvrez l'application Claude, et vérifiez :

```
git --version
node -v
```

- [ ] Git installé
- [ ] Node.js (version LTS) installé
- [ ] VS Code installé (facultatif, pour regarder le code)

## Étape 2 : créer les comptes (30 à 45 min)

Créez-les vous-même. **Ne collez jamais une clé secrète dans le chat** : je préparerai un fichier `.env.local` que vous remplirez.

| Service | À quoi il sert | Conseil |
|---|---|---|
| GitHub | Héberger le code | Dépôt privé |
| Supabase | Base de données, comptes utilisateurs, cloisonnement par client | Région Europe (Francfort ou Paris) pour le RGPD |
| Vercel | Mettre l'application en ligne | Se connecter avec GitHub |
| Stripe | Abonnements et paiements | Rester en mode test jusqu'au lancement ; activer le compte (SIREN, IBAN) avant d'encaisser |
| Anthropic Console | Clé API Claude pour l'IA | Fixer une limite de dépense mensuelle |
| Resend (ou Brevo) | Emails de l'application (invitations, mots de passe) | Nécessite votre nom de domaine |
| Nom de domaine | Adresse de l'application | OVH, Gandi… |
| Plus tard : Google Cloud | Envoi des emails depuis la boîte Gmail des commerciaux | Validation Google à prévoir, quelques semaines |

- [ ] GitHub
- [ ] Supabase
- [ ] Vercel
- [ ] Stripe (mode test)
- [ ] Anthropic Console
- [ ] Nom de domaine

## Étape 3 : décisions produit (à me transmettre)

- [ ] Nom commercial de l'application
- [ ] Offres et prix (ex. Solo / Équipe / Entreprise), mensuel et/ou annuel
- [ ] Essai gratuit : oui ou non, durée
- [ ] Limites par offre : nombre d'utilisateurs, de prospects, d'usage IA
- [ ] Entité qui facture (société, pays, TVA)

## Étape 4 : construction, sprint par sprint (avec Claude)

Chaque sprint : je code, vous testez en local (`npm run dev`), puis mise en ligne d'une version de test sur Vercel.

1. **Socle** : inscription et connexion, entreprises clientes isolées, rôles admin / commercial, invitations, espace super admin.
2. **Cockpit** : Espace de travail IA, recherches et questionnaire, prospects et angle commercial, séquences email (5 relances) et LinkedIn, Plan du jour, import / export.
3. **Facturation** : offres Stripe, essai, espace client, accès coupé en cas d'impayé, revenus mensuels dans le super admin.
4. **Envois réels** : emails envoyés depuis Gmail / Outlook ou Brevo, synchronisation NetHunt.
5. **Téléphonie et enrichissement** : Aircall / Ringover (transcriptions reçues automatiquement), Apollo.

## Étape 5 : avant d'ouvrir aux clients

- [ ] Mentions légales, CGU et CGV
- [ ] RGPD : politique de confidentialité, contrat de sous-traitance (DPA) pour vos clients, registre des traitements, suppression des données sur demande
- [ ] Stripe en mode réel
- [ ] Domaine et emails de l'application configurés
- [ ] Sauvegardes Supabase activées
- [ ] Page de tarifs et page d'inscription

## Étape 6 : lancement

- [ ] Bêta avec 3 à 5 clients
- [ ] Recueil des retours, corrections
- [ ] Ouverture publique
