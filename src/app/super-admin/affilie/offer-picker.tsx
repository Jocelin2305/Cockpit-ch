"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import {
  euros, hasUpsells, OFFERS, offerById, offerPrice, PRIORITY_SUPPORT_HOURS, PRIORITY_SUPPORT_MONTHLY, THIRD_PARTY_COSTS, WHITE_LABEL_PRICE, whiteLabelInstallments,
} from "@/lib/reseller-offers";
import { chooseOffer } from "./actions";

type Current = { offer: string; billing: string; upsellWhiteLabel: boolean; whiteLabelInstallments: number; upsellPriority: boolean };

// Page de choix d'offre : bascule mensuel / annuel, options affichées seulement après le choix de A ou B.
export function OfferPicker({ current }: { current: Current }) {
  const [state, action] = useActionState(chooseOffer, undefined);
  const [billing, setBilling] = useState(current.billing);
  const [offer, setOffer] = useState(current.offer);
  const [wl, setWl] = useState(current.upsellWhiteLabel);
  const [inst, setInst] = useState(current.whiteLabelInstallments);
  const [prio, setPrio] = useState(current.upsellPriority);
  const o = offerById(offer);
  const up = hasUpsells(offer);
  const monthly = (billing === "annuel" ? o.annual / 12 : o.monthly) + (up && prio ? PRIORITY_SUPPORT_MONTHLY : 0);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="offer" value={offer} />
      <input type="hidden" name="billing" value={billing} />
      <div className="tabs" role="group" aria-label="Facturation">
        <button type="button" aria-pressed={billing === "mensuel"} onClick={() => setBilling("mensuel")}>Mensuel</button>
        <button type="button" aria-pressed={billing === "annuel"} onClick={() => setBilling("annuel")}>Annuel · 2 mois offerts</button>
      </div>
      <div className="offers">
        {OFFERS.map((x) => (
          <button key={x.id} type="button" className={`offer-card choice${x.id === offer ? " on" : ""}`} aria-pressed={x.id === offer} onClick={() => setOffer(x.id)}>
            <div className="row between"><b>{x.name}</b>{x.id === current.offer && <span className="chip ok">actuelle</span>}</div>
            <span className="big">{euros(offerPrice(x, billing))}<small> HT / {billing === "annuel" ? "an" : "mois"}</small></span>
            <span className="muted small">Commission Cockpit&apos;ch sur vos abonnements : {Math.round(x.rate * 100)} %</span>
            <ul>{x.includes.map((i) => <li key={i}>{i}</li>)}<li>{x.support}</li></ul>
          </button>
        ))}
      </div>
      {up && (
        <div className="panel stack">
          <h3>Options de l&apos;{o.name}</h3>
          <label className="check"><input type="checkbox" name="whiteLabel" value="1" checked={wl} onChange={(e) => setWl(e.target.checked)} /> Marque blanche (pack de marque) : {euros(WHITE_LABEL_PRICE)} HT en une fois</label>
          {wl && (
            <div className="row">
              <label className="check"><input type="radio" name="installments" value="1" checked={inst === 1} onChange={() => setInst(1)} /> En 1 fois</label>
              <label className="check"><input type="radio" name="installments" value="3" checked={inst === 3} onChange={() => setInst(3)} /> En 3 fois ({whiteLabelInstallments(3).map(euros).join(" + ")})</label>
            </div>
          )}
          <label className="check"><input type="checkbox" name="priority" value="1" checked={prio} onChange={(e) => setPrio(e.target.checked)} /> Support prioritaire : +{euros(PRIORITY_SUPPORT_MONTHLY)} HT / mois, réponse visée sous {PRIORITY_SUPPORT_HOURS} h</label>
        </div>
      )}
      <div className="panel">
        <p><b>Total : {euros(Math.round(monthly * 100) / 100)} HT / mois</b>{billing === "annuel" ? ` (soit ${euros(o.annual)} HT par an pour l'offre)` : ""}{up && wl ? ` + marque blanche ${euros(WHITE_LABEL_PRICE)} HT${inst === 3 ? " en 3 fois" : ""}` : ""} · engagement 1 an.</p>
        <p className="muted small">Coûts tiers à votre charge : {THIRD_PARTY_COSTS.join(" ; ")}. Vous fixez librement le prix de vos abonnements ; la commission porte uniquement sur les abonnements que vous facturez (hors frais de mise en place).</p>
      </div>
      <div className="row"><SubmitButton pending="Enregistrement…">Valider cette offre</SubmitButton></div>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}
