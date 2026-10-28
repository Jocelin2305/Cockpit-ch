import { appUrl } from "@/lib/auth";
import { aiEnabled } from "@/lib/ai";
import { PHONE_PROVIDERS, type PhoneProvider } from "@/lib/telephony";
import { CopyField, SubmitButton } from "@/components/forms";
import { connectPhone, disconnectPhone } from "./phone-actions";

const WHERE: Record<PhoneProvider, string> = {
  aircall: "Aircall : Intégrations → Webhook → ajoutez cette adresse et cochez les événements d'appel (fin d'appel, messagerie, transcription).",
  ringover: "Ringover : Dashboard → Développeur → Webhooks → collez cette adresse sur les événements d'appel (raccroché, manqué, messagerie, transcription).",
  generique: "Envoyez un POST JSON à cette adresse à chaque fin d'appel : event (call.ended ou call.transcript), call_id, direction, number, agent_email, duration_seconds, answered, voicemail_url, recording_url, transcript.",
};

export function PhonePanel({ provider, token }: { provider: string | null; token: string | null }) {
  const p = provider as PhoneProvider | null;
  return (
    <section className="panel" data-tip="Branchez votre téléphonie : chaque appel est enregistré sur la bonne fiche, les appels manqués et messages vocaux remontent dans le Point du jour.">
      <h2>Téléphonie</h2>
      {p && token ? (
        <>
          <p>Connectée : <span className="chip ok">{PHONE_PROVIDERS[p]}</span></p>
          <CopyField label="Adresse du webhook (secrète)" value={`${appUrl()}/api/telephonie/${token}`} />
          <p className="muted small">{WHERE[p]}</p>
          <p className="muted small">
            Chaque appel est rattaché au prospect par son numéro.{" "}
            {aiEnabled() ? "Quand la transcription arrive, l'IA rédige le compte rendu et met la fiche à jour (statut, rappel, qualification)." : "Le compte rendu automatique à partir de la transcription s'activera avec la clé de l'IA."}
          </p>
          <form action={disconnectPhone}><SubmitButton className="btn" pending="…">Déconnecter</SubmitButton></form>
        </>
      ) : (
        <form action={connectPhone} className="row">
          <label className="field grow">
            <span className="label-text">Votre téléphonie</span>
            <select className="input" name="provider" defaultValue="aircall">
              {Object.entries(PHONE_PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <SubmitButton>Connecter</SubmitButton>
        </form>
      )}
      <p className="hint">Les numéros de l&apos;outil s&apos;ouvrent dans l&apos;application installée sur le poste (Aircall, Ringover, téléphone…) : l&apos;appel part d&apos;un clic.</p>
    </section>
  );
}
