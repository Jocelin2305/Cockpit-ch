import Link from "next/link";
import { SubmitButton } from "@/components/forms";
import { setPreference } from "./actions";
import { ReportNowButton } from "./report-now";

function Toggle({ k, on, label, hint }: { k: string; on: boolean; label: string; hint: string }) {
  return (
    <form action={setPreference} className="row between">
      <input type="hidden" name="key" value={k} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <div><b>{label}</b> {on ? <span className="chip ok">activé</span> : <span className="chip">désactivé</span>}<p className="muted small">{hint}</p></div>
      <SubmitButton className="btn sm" pending="…">{on ? "Désactiver" : "Activer"}</SubmitButton>
    </form>
  );
}

export function AutomationPanel({ autoSend, weeklyReport, isAdmin, hasMailbox }: { autoSend: boolean; weeklyReport: boolean; isAdmin: boolean; hasMailbox: boolean }) {
  return (
    <section className="panel stack" data-tip="Laissez l'outil envoyer vos relances et recevez chaque lundi le bilan de la semaine.">
      <h2>Automatisations</h2>
      <Toggle
        k="autoSend"
        on={autoSend}
        label="Envoi automatique des relances"
        hint={hasMailbox
          ? "Chaque matin de semaine, vers 8 h, les relances dues de vos prospects partent seules depuis votre boîte. Les emails J0 restent lancés par vous (« Lancer la séquence »). Sans cette option, vous les envoyez en un clic depuis le point du jour."
          : "Connectez d'abord votre boîte mail ci-dessus."}
      />
      {isAdmin && (
        <>
          <Toggle k="weeklyReport" on={weeklyReport} label="Rapport hebdomadaire par email" hint="Chaque lundi matin : prospects ajoutés, emails, réponses, appels, rendez-vous et affaires gagnées de la semaine, comparés à la précédente, avec le détail par commercial." />
          <div className="row"><Link className="btn sm" href="/app/rapport">Voir le rapport de la semaine</Link><ReportNowButton /></div>
        </>
      )}
    </section>
  );
}
