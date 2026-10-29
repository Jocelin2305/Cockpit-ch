// Partenaires revendeurs : formules, commissions et contrôles du dossier (SIRET, IBAN).
import { randomBytes } from "node:crypto";
import { accessState } from "./billing";
import { planById, PLANS } from "./plans";
import { offerById } from "./reseller-offers";

export * from "./reseller-offers";

export const newResellerCode = () => randomBytes(5).toString("hex");

type Org = Parameters<typeof accessState>[0] & { id: string; name: string; plan: string };

// CA mensuel (HT) des clients payants apportés et commission du revendeur.
export function resellerStats<T extends Org>(orgs: T[], offerId: string) {
  const rate = offerById(offerId).rate;
  const rows = orgs.map((o) => {
    const st = accessState(o);
    const paying = st.kind === "active" || st.kind === "past_due";
    const ca = paying ? planById(o.plan)?.price ?? 0 : 0;
    return { org: o, state: st, paying, ca, commission: ca * rate };
  });
  const active = rows.filter((r) => r.paying).length;
  const ca = rows.reduce((s, r) => s + r.ca, 0);
  return { rows, active, trials: rows.filter((r) => r.state.kind === "trial").length, ca, commission: ca * rate, rate };
}

// Prix moyen d'un client, pour projeter les paliers : celui des clients actuels, sinon l'offre d'entrée.
export const avgClientPrice = (active: number, ca: number) => (active ? ca / active : PLANS[0].price);


// SIRET : 14 chiffres, clé de Luhn (La Poste fait exception).
export function validSiret(v: string) {
  const s = v.replace(/\s/g, "");
  if (!/^\d{14}$/.test(s)) return false;
  if (s.startsWith("356000000")) return true;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(s[13 - i]);
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}

// IBAN : format et clé de contrôle (modulo 97).
export function validIban(v: string) {
  const s = v.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const digits = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of digits) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

export const dossierComplete = (r: { companyName: string; siret: string; address: string; managerName: string; managerEmail: string; managerPhone: string; ibanLast4: string }) =>
  [r.companyName, r.siret, r.address, r.managerName, r.managerEmail, r.managerPhone, r.ibanLast4].every((v) => v.trim());
