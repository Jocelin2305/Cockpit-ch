import type { Metadata } from "next";
import { EDITOR, SUBPROCESSORS, UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Contrat de traitement des données" };

// Contrat de sous-traitance (article 28 du RGPD), accepté avec les conditions d'utilisation.
export default function DataProcessing() {
  return (
    <>
      <h1>Contrat de traitement des données</h1>
      <p className="muted">Dernière mise à jour : {UPDATED}. Article 28 du RGPD, entre le Client (responsable de traitement) et {EDITOR.name} (sous-traitant). Il fait partie des conditions d&apos;utilisation.</p>

      <h2>1. Objet et durée</h2>
      <p>{EDITOR.name} traite les données de prospection du Client pour fournir le service, pendant la durée de l&apos;abonnement puis 90 jours avant suppression, sauf export ou suppression plus tôt par le Client.</p>

      <h2>2. Données et personnes concernées</h2>
      <p>Contacts professionnels des prospects et utilisateurs du Client : nom, fonction, entreprise, email et téléphone professionnels, profil LinkedIn, notes, emails échangés, appels et transcriptions si la téléphonie est connectée.</p>

      <h2>3. Instructions</h2>
      <p>{EDITOR.name} ne traite ces données que sur les instructions du Client, données par l&apos;usage du service. Il ne les revend pas, ne les partage pas entre clients et ne les utilise pas pour entraîner des modèles d&apos;IA. Il prévient le Client si une instruction lui paraît contraire à la réglementation.</p>

      <h2>4. Confidentialité et sécurité</h2>
      <p>Les personnes autorisées à accéder aux données sont tenues à la confidentialité. Connexions chiffrées, données isolées par entreprise, secrets chiffrés, sauvegardes et contrôle des accès.</p>

      <h2>5. Sous-traitants ultérieurs</h2>
      <p>Le Client autorise le recours aux sous-traitants ci-dessous, tenus aux mêmes obligations. Il est prévenu 30 jours avant tout ajout ou remplacement et peut s&apos;y opposer en résiliant.</p>
      <ul>
        {SUBPROCESSORS.map((s) => <li key={s.name}><b>{s.name}</b> : {s.role} ({s.where}).</li>)}
      </ul>

      <h2>6. Droits des personnes et assistance</h2>
      <p>{EDITOR.name} aide le Client à répondre aux demandes d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition, et lui transmet sans tarder celles qu&apos;il reçoit directement. Le Client reste seul responsable de l&apos;information des personnes démarchées et de la base légale de sa prospection.</p>

      <h2>7. Violation de données</h2>
      <p>{EDITOR.name} informe le Client dans les meilleurs délais, et si possible sous 48 heures, de toute violation de données le concernant, avec les informations dont il dispose.</p>

      <h2>8. Fin du contrat et audit</h2>
      <p>À la fin du contrat, le Client exporte ses données depuis Paramètres ; elles sont ensuite supprimées dans le délai indiqué à l&apos;article 1. {EDITOR.name} met à disposition les informations nécessaires pour démontrer le respect de ces obligations. Contact : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>.</p>
    </>
  );
}
