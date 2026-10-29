import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Brand } from "@/components/brand";
import { BOOKING_URL, EDITOR } from "@/lib/legal";
import { PARTNER_TRIAL_DAYS, PLANS, TRIAL_DAYS } from "@/lib/plans";
import { OFFERS } from "@/lib/reseller-offers";

export const metadata: Metadata = {
  title: "Cockpit'ch · le copilote de prospection B2B",
  description: "Trouvez vos prospects, sachez quoi leur dire, envoyez et relancez, appelez et suivez vos résultats : toute la prospection B2B dans un seul outil, en français.",
};

const STEPS = [
  ["Ciblez", "Un questionnaire de 2 minutes : zone, secteur, taille, fonctions visées, ce que vous vendez."],
  ["Trouvez", "Cockpit'ch cherche de vraies entreprises actives dans le registre national, et leurs contacts avec Apollo."],
  ["Écrivez", "L'IA rédige pour chaque prospect un angle commercial et un argumentaire, repris dans vos séquences."],
  ["Lancez", "Un clic envoie l'email J0 depuis votre boîte ; les relances et LinkedIn suivent, jusqu'à la réponse."],
];

const FEATURES = [
  ["Point du jour", "Chaque matin, votre agent IA vous dit quoi faire : rappels, relances dues, réponses reçues, appels manqués."],
  ["Recherche de prospects", "Registre national des entreprises, sans doublon, priorité A / B / C, fichier à jour en un clic."],
  ["Séquences email + LinkedIn", "Email J0, jusqu'à 8 relances et LinkedIn en parallèle, envoyés depuis Gmail ou Outlook."],
  ["Appels", "Numéros cliquables, prise de notes, compte rendu et qualification automatiques, téléphonie connectée."],
  ["Tableau de bord", "Pipeline, taux de réponse, statistiques d'appels par commercial, rapport chaque lundi au dirigeant."],
  ["Votre CRM à jour", "HubSpot ou Pipedrive mis à jour en un clic, export Excel quand vous voulez."],
];

const FAQ = [
  ["Faut-il une carte bancaire pour l'essai ?", `Non. L'essai dure ${TRIAL_DAYS} jours (${PARTNER_TRIAL_DAYS} avec le code d'un partenaire), sans engagement.`],
  ["Que se passe-t-il à la fin de l'essai ?", "Vous gardez votre compte, vos recherches, vos prospects et vos séquences : il suffit de choisir une offre et de démarrer le paiement. Sans abonnement, l'accès est suspendu et vos données sont conservées 90 jours."],
  ["D'où viennent les prospects ?", "Du registre national des entreprises (données publiques), de vos imports, et d'Apollo si vous connectez votre compte pour les emails et LinkedIn."],
  ["Mes emails partent-ils de ma boîte ?", "Oui : vous connectez Gmail ou Outlook, les emails partent de votre adresse et les réponses remontent dans l'outil."],
  ["Est-ce conforme au RGPD ?", "La base de données est hébergée dans l'Union européenne, chaque email contient un lien de désinscription et les adresses désinscrites ne sont plus jamais contactées."],
];

export default async function Home() {
  const session = await getSession();
  const appHref = session?.membership ? "/app" : session?.user.isSuperAdmin || session?.reseller ? "/super-admin" : null;
  const from = Math.min(...PLANS.map((p) => p.price));

  return (
    <div className="landing">
      <header className="lp-head">
        <Brand />
        <nav className="row">
          <a className="btn ghost" href="#fonctionnement">Fonctionnement</a>
          <a className="btn ghost" href="#tarifs">Tarifs</a>
          <a className="btn ghost" href="#partenaires">Partenaires</a>
          {appHref ? <Link className="btn primary" href={appHref}>Ouvrir mon espace</Link> : <><Link className="btn" href="/connexion">Se connecter</Link><Link className="btn primary" href="/inscription">Essai gratuit</Link></>}
        </nav>
      </header>

      <section className="lp-hero">
        <span className="label">Prospection B2B · en français</span>
        <h1>Le copilote de prospection qui vous dit qui contacter, quoi leur dire, et quand relancer.</h1>
        <p className="lp-lead">Cockpit&apos;ch trouve vos prospects, rédige vos messages, envoie et relance depuis votre boîte, et vous ouvre chaque matin avec le point du jour. Un seul outil à la place du fichier Excel, de l&apos;outil d&apos;emailing et du bloc-notes d&apos;appels.</p>
        <div className="row">
          <Link className="btn primary lg" href="/inscription">Essai gratuit · {TRIAL_DAYS} jours</Link>
          <a className="btn ghost lg" href={BOOKING_URL} target="_blank" rel="noreferrer">Réserver un appel</a>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-pain"><b>Prospecter prend du temps</b><p className="muted">Trouver les bonnes entreprises, le bon contact, ses coordonnées : des heures par semaine.</p></div>
        <div className="lp-pain"><b>Les relances se perdent</b><p className="muted">Une bonne partie des réponses arrive après une relance, justement celle qu&apos;on oublie d&apos;envoyer.</p></div>
        <div className="lp-pain"><b>Le dirigeant ne voit rien</b><p className="muted">Sans suivi, impossible de savoir ce qui marche, ni qui fait quoi dans l&apos;équipe.</p></div>
      </section>

      <section className="lp-sec" id="fonctionnement">
        <h2>Comment ça marche</h2>
        <ol className="lp-steps">
          {STEPS.map(([t, d], i) => <li key={t}><span className="ob-n">{i + 1}</span><div><b>{t}</b><p className="muted">{d}</p></div></li>)}
        </ol>
      </section>

      <section className="lp-sec">
        <h2>Tout ce dont un commercial a besoin pour performer</h2>
        <div className="lp-grid">
          {FEATURES.map(([t, d]) => <div key={t} className="lp-card"><b>{t}</b><p className="muted">{d}</p></div>)}
        </div>
      </section>

      <section className="lp-sec" id="tarifs">
        <h2>Tarifs</h2>
        <p className="muted">À partir de {from} € HT par mois. Essai gratuit de {TRIAL_DAYS} jours, sans carte bancaire, résiliable à tout moment.</p>
        <div className="plans">
          {PLANS.map((p) => (
            <div key={p.id} className="plan-card">
              <b>{p.name}</b>
              <span className="price"><span className="mono">{p.price} €</span> HT / mois</span>
              <p className="muted small">{p.pitch}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link className="btn primary" href="/inscription">Commencer l&apos;essai</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-sec" id="partenaires">
        <h2>Devenez partenaire revendeur</h2>
        <p className="muted">Consultants, agences, formateurs : proposez Cockpit&apos;ch à vos clients et touchez une commission sur le chiffre d&apos;affaires généré. Votre espace partenaire suit vos clients, vos commissions et vos supports de vente.</p>
        <div className="offers">
          {OFFERS.map((o) => (
            <div key={o.id} className="offer-card">
              <b>{o.name}</b>
              <span className="big">{Math.round(o.rate * 100)} %</span>
              <span className="muted small">{o.entry ? `${o.entry} € à l'entrée` : "Aucun coût d'entrée"} · {o.monthly} € / mois{o.commitment ? ` · ${o.commitment}` : ""}</span>
              <ul>{o.perks.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="row"><a className="btn primary" href={BOOKING_URL} target="_blank" rel="noreferrer">Parler du programme partenaire</a></div>
      </section>

      <section className="lp-sec">
        <h2>Questions fréquentes</h2>
        <div className="lp-faq">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p className="muted">{a}</p></details>)}
        </div>
      </section>

      <section className="lp-cta">
        <h2>Testez-le sur votre propre marché</h2>
        <p>Créez votre espace, indiquez votre secteur et votre département : vos premiers prospects arrivent en 2 minutes. À la fin de l&apos;essai, vous gardez tout et choisissez simplement votre offre.</p>
        <div className="row"><Link className="btn primary lg" href="/inscription">Commencer l&apos;essai gratuit</Link><a className="btn lg" href={BOOKING_URL} target="_blank" rel="noreferrer">Réserver un appel</a></div>
      </section>

      <footer className="lp-foot">
        <span className="muted small">© {new Date().getFullYear()} {EDITOR.name} · Cockpit&apos;ch</span>
        <nav className="row small"><Link href="/mentions-legales">Mentions légales</Link><Link href="/cgu">CGU</Link><Link href="/confidentialite">Confidentialité</Link><a href={`mailto:${EDITOR.email}`}>Contact</a></nav>
      </footer>
    </div>
  );
}
