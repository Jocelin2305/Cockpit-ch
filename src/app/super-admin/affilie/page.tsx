import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { appUrl, requireReseller } from "@/lib/auth";
import { creditCheckout, stripe, stripeEnabled } from "@/lib/billing";
import { RESELLER_PACKS } from "@/lib/credit-grid";
import { walletBalance } from "@/lib/credits";
import { BOOKING_URL } from "@/lib/legal";
import {
  dossierComplete, euros, offerById, PRIORITY_SUPPORT_HOURS, prioritySupport, resellerMonthlyFee, resellerStats, VIDEO_CATEGORIES, whiteLabelEligible, youtubeId,
} from "@/lib/resellers";
import { buyResellerCredits } from "./actions";
import { DossierForm } from "./dossier-form";
import { OfferPicker } from "./offer-picker";
import { FeatureForm, TicketForm } from "./support-forms";

export const metadata: Metadata = { title: "Espace affilié" };

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function AffiliatePage({ searchParams }: { searchParams: Promise<{ recharge?: string; erreur?: string }> }) {
  const { reseller: r } = await requireReseller();
  const { recharge, erreur } = await searchParams;
  // Retour du paiement : les crédits sont ajoutés sans attendre le webhook.
  let recharged = false;
  if (recharge && stripeEnabled()) {
    try {
      const s = await stripe().checkout.sessions.retrieve(recharge);
      if (s.metadata?.resellerId === r.id) recharged = await creditCheckout(s);
    } catch {
      // Le webhook créditera le pack quelques secondes plus tard.
    }
  }
  const [orgs, messages, videos, tickets, features, balance, used] = await Promise.all([
    db.organization.findMany({ where: { resellerId: r.id } }),
    db.resellerMessage.findMany({ where: { createdAt: { gte: r.createdAt } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.resellerVideo.findMany({ orderBy: { createdAt: "asc" } }),
    db.supportTicket.findMany({ where: { resellerId: r.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.featureRequest.findMany({ where: { resellerId: r.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    walletBalance({ resellerId: r.id }),
    db.creditEntry.groupBy({ by: ["organizationId"], where: { resellerId: r.id, kind: "use", createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, _sum: { delta: true } }),
  ]);
  const usedBy = new Map(used.map((u) => [u.organizationId, 0 - (u._sum.delta ?? 0)]));
  const offer = offerById(r.offer);
  const s = resellerStats(orgs, r.offer);
  const active = r.offerStatus === "actif";
  const priority = prioritySupport(r);
  const referral = `${appUrl()}/inscription?partenaire=${r.code}`;

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <span className="label">Espace affilié</span>
          <h1>{r.companyName || "Mon espace distributeur"}</h1>
          <p className="muted">{offer.name} · {r.billing === "annuel" ? "facturation annuelle" : "facturation mensuelle"} · {active ? <span className="chip ok">active</span> : <span className="chip late">en attente du paiement</span>} · distributeur depuis le {fmt(r.createdAt)}</p>
        </div>
      </header>

      {!dossierComplete(r) && <p className="alert banner">Complétez votre dossier (SIRET, adresse, gérant) en bas de page.</p>}

      <div className="kpis">
        <div className="kpi"><span className="v">{s.active}</span><span className="k">clients actifs</span></div>
        <div className="kpi"><span className="v">{s.trials}</span><span className="k">clients en essai</span></div>
        <div className="kpi win"><span className="v">{euros(Math.round(s.ca))}</span><span className="k">vos abonnements facturés / mois (HT)</span></div>
        <div className="kpi"><span className="v">{euros(Math.round(s.commission * 100) / 100)}</span><span className="k">commission Cockpit&apos;ch ({Math.round(s.rate * 100)} %)</span></div>
      </div>
      <p className="muted small">Votre offre : {euros(Math.round(resellerMonthlyFee(r) * 100) / 100)} HT / mois. Déclarez le prix de chaque client dans <Link href="/super-admin/clients">Mes clients</Link> · <a href="/super-admin/affilie/export">Exporter le relevé du mois (CSV)</a></p>

      <section className="panel" id="credits">
        <div className="panel-head"><h2>Crédits de vos clients</h2><span className={`chip${balance > 100 ? " ok" : " late"}`}>{balance.toLocaleString("fr-FR")} crédits</span></div>
        {recharged && <p className="alert ok">Merci ! Vos crédits sont ajoutés.</p>}
        {erreur === "stripe" && <p className="alert error">Le paiement en ligne n&apos;est pas encore configuré. Contactez Cockpit&apos;ch.</p>}
        {balance <= 100 && <p className="alert">Stock presque épuisé : à zéro, vos clients ne peuvent plus utiliser l&apos;IA ni enrichir leurs contacts.</p>}
        <p className="muted small">Vos clients consomment ce stock : l&apos;IA à chaque action, l&apos;enrichissement seulement quand un email ou un numéro est trouvé.</p>
        <div className="plans">
          {RESELLER_PACKS.map((p) => (
            <div key={p.id} className="plan-card">
              <h3>{p.credits.toLocaleString("fr-FR")} crédits</h3>
              <p className="price"><span className="mono">{euros(p.price)}</span> HT</p>
              <form action={buyResellerCredits}><input type="hidden" name="pack" value={p.id} /><button className="btn primary" type="submit">Acheter</button></form>
            </div>
          ))}
        </div>
        {orgs.length > 0 && (
          <ul className="list">
            {orgs.map((o) => <li key={o.id} className="row between"><span>{o.name}</span><span className="muted small">{(usedBy.get(o.id) ?? 0).toLocaleString("fr-FR")} crédits sur 30 jours</span></li>)}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>{active ? "Changer d'offre" : "Choisir mon offre"}</h2>
        <p className="muted small">Engagement 1 an. Le paiement annuel offre 2 mois. Votre offre s&apos;active à la réception du paiement.</p>
        <OfferPicker current={{ offer: r.offer, billing: r.billing, upsellWhiteLabel: r.upsellWhiteLabel, whiteLabelInstallments: r.whiteLabelInstallments, upsellPriority: r.upsellPriority }} />
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Marque blanche</h2>{r.whiteLabel ? <span className="chip ok">débloquée</span> : <span className="chip">non débloquée</span>}</div>
        {r.whiteLabel ? (
          <p>Votre plateforme porte votre nom, votre logo et vos couleurs pour vos clients. <Link className="btn sm primary" href="/super-admin/affilie/marque">Personnaliser l&apos;application</Link></p>
        ) : (
          <p className="muted">{whiteLabelEligible(r) ? "Elle sera débloquée par Cockpit'ch dès réception du paiement." : "Incluse dans l'offre C, ou en option (997 € HT) avec les offres A et B."}</p>
        )}
      </section>

      <section className="panel">
        <h2>Apporter un client</h2>
        <p className="muted small">Chaque entreprise qui s&apos;inscrit avec votre lien ou votre code vous est rattachée, profite d&apos;un mois offert{r.whiteLabel ? " et arrive sur votre plateforme à votre marque" : ""}.</p>
        <input className="input mono" readOnly value={referral} aria-label="Lien d'inscription parrainé" />
        <p className="muted small">Votre code partenaire : <b className="mono">{r.code}</b></p>
      </section>

      <div className="grid2">
        <section className="panel">
          <div className="panel-head"><h2>Support</h2><span className={`chip${priority ? " ok" : ""}`}>{priority ? `prioritaire · ${PRIORITY_SUPPORT_HOURS} h` : `standard · ${offer.supportHours} h`}</span></div>
          <p className="muted small">{priority ? "File prioritaire." : offer.support}{r.offer === "B" && <> · <a href={BOOKING_URL} target="_blank" rel="noreferrer">Réserver une visio avec notre équipe</a></>}</p>
          <TicketForm hours={priority ? PRIORITY_SUPPORT_HOURS : offer.supportHours} />
          {tickets.length > 0 && (
            <ul className="list">
              {tickets.map((t) => <li key={t.id}><b>{t.subject}</b> <span className="chip">{t.status}</span>{t.answer && <p className="muted small pre">{t.answer}</p>}</li>)}
            </ul>
          )}
        </section>
        <section className="panel">
          <h2>Demande de fonctionnalité</h2>
          {r.offer === "C" && active ? (
            <>
              <p className="muted small">Une demande par trimestre, acceptée si elle sert à plusieurs clients et reste réalisable en un temps borné. Réponse sous 10 jours ouvrés : acceptée, refusée ou chiffrée.</p>
              <FeatureForm />
            </>
          ) : <p className="muted small">Incluse dans l&apos;offre C : une demande de fonctionnalité par trimestre.</p>}
          {features.length > 0 && (
            <ul className="list">
              {features.map((f) => <li key={f.id}><b>{f.title}</b> <span className="chip">{f.status}</span> <span className="muted small">réponse avant le {fmt(f.dueAt)}</span>{f.answer && <p className="muted small pre">{f.answer}</p>}</li>)}
            </ul>
          )}
        </section>
      </div>

      {messages.length > 0 && (
        <section className="panel">
          <h2>Messages de Cockpit&apos;ch</h2>
          <div className="stack">
            {messages.map((m) => (
              <article key={m.id} className="message">
                <div className="row between"><b>{m.subject}</b><span className="muted small">{fmt(m.createdAt)}</span></div>
                <p className="pre">{m.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Centre de vidéos de vente</h2>
        {VIDEO_CATEGORIES.map((c) => {
          const list = videos.filter((v) => v.category === c.id);
          return (
            <div key={c.id} className="stack">
              <span className="label">{c.label}</span>
              {list.length === 0 ? <p className="muted small">Bientôt disponible.</p> : (
                <div className="videos">
                  {list.map((v) => {
                    const yt = youtubeId(v.url);
                    return (
                      <a key={v.id} className="video" href={v.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {yt ? <img src={`https://i.ytimg.com/vi/${yt}/mqdefault.jpg`} alt="" loading="lazy" /> : <span className="video-ph">▶</span>}
                        <b>{v.title}</b>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2>Mon dossier distributeur</h2>
        <DossierForm d={{ companyName: r.companyName, siret: r.siret, address: r.address, managerName: r.managerName, managerEmail: r.managerEmail, managerPhone: r.managerPhone, bic: r.bic, ibanLast4: r.ibanLast4 }} />
      </section>
    </div>
  );
}
