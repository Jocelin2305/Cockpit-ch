import type { Metadata } from "next";
import { db } from "@/lib/db";
import { appUrl, requireReseller } from "@/lib/auth";
import { EDITOR } from "@/lib/legal";
import { avgClientPrice, dossierComplete, euros, MILESTONES, offerById, OFFERS, resellerStats, VIDEO_CATEGORIES, youtubeId } from "@/lib/resellers";
import { DossierForm } from "./dossier-form";

export const metadata: Metadata = { title: "Espace affilié" };

const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function AffiliatePage() {
  const { reseller: r } = await requireReseller();
  const [orgs, messages, videos] = await Promise.all([
    db.organization.findMany({ where: { resellerId: r.id } }),
    db.resellerMessage.findMany({ where: { createdAt: { gte: r.createdAt } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.resellerVideo.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const offer = offerById(r.offer);
  const s = resellerStats(orgs, r.offer);
  const price = avgClientPrice(s.active, s.ca);
  const next = MILESTONES.find((m) => m > s.active);
  const referral = `${appUrl()}/inscription?partenaire=${r.code}`;
  const visio = `mailto:${EDITOR.email}?subject=${encodeURIComponent(`[Cockpit'ch partenaire] Visio mensuelle · ${r.companyName || r.email}`)}`;

  return (
    <div className="view wide">
      <header className="view-head">
        <div>
          <span className="label">Espace affilié</span>
          <h1>{r.companyName || "Mon espace partenaire"}</h1>
          <p className="muted">Formule <b>{offer.name}</b> · {Math.round(offer.rate * 100)} % de commission sur le CA généré par vos clients · partenaire depuis le {fmt(r.createdAt)}</p>
        </div>
      </header>

      {!dossierComplete(r) && <p className="alert banner">Complétez votre dossier (RIB, SIRET, adresse, gérant) pour recevoir vos commissions.</p>}

      <div className="kpis">
        <div className="kpi"><span className="v">{s.active}</span><span className="k">clients actifs</span></div>
        <div className="kpi"><span className="v">{s.trials}</span><span className="k">clients en essai</span></div>
        <div className="kpi"><span className="v">{euros(s.ca)}</span><span className="k">CA mensuel généré (HT)</span></div>
        <div className="kpi win"><span className="v">{euros(s.commission)}</span><span className="k">ma commission ce mois</span></div>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Mes paliers de commission</h2>{next && <span className="label">prochain palier : {next} client{next > 1 ? "s" : ""}, encore {next - s.active}</span>}</div>
        <p className="muted small">Commission projetée selon le nombre de clients actifs, au prix moyen de {euros(price)} HT par client et par mois.</p>
        <div className="milestones">
          {MILESTONES.map((m) => (
            <div key={m} className={`milestone${s.active >= m ? " on" : m === next ? " next" : ""}`}>
              <span className="muted small">{m} client{m > 1 ? "s" : ""}</span>
              <b>{euros(Math.round(m * price * offer.rate))}</b>
              <span className="muted small">/ mois · {euros(Math.round(m * price * offer.rate * 12))} / an</span>
            </div>
          ))}
        </div>
        <div className="offers">
          {OFFERS.map((o) => (
            <div key={o.id} className={`offer-card${o.id === offer.id ? " on" : ""}`}>
              <div className="row between"><b>{o.name}</b>{o.id === offer.id && <span className="chip ok">ma formule</span>}</div>
              <span className="big">{Math.round(o.rate * 100)} %</span>
              <span className="muted small">{o.entry ? `${euros(o.entry)} à l'entrée` : "Aucun coût d'entrée"} · {euros(o.monthly)} / mois{o.commitment ? ` · ${o.commitment}` : ""}</span>
              <ul>{o.perks.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Apporter un client</h2>
        <p className="muted small">Partagez votre lien ou votre code : chaque entreprise qui s&apos;inscrit avec l&apos;un d&apos;eux vous est rattachée et profite de son premier mois offert. Vous pouvez aussi créer et paramétrer son compte vous-même dans « Mes clients ».</p>
        <input className="input mono" readOnly value={referral} aria-label="Lien d'inscription parrainé" />
        <p className="muted small">Votre code partenaire, à saisir à l&apos;inscription : <b className="mono">{r.code}</b></p>
      </section>

      {messages.length > 0 && (
        <section className="panel">
          <h2>Messages du fondateur</h2>
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
        <div className="panel-head"><h2>Centre d&apos;aide affilié</h2><a className="btn sm" href={visio}>Réserver ma visio mensuelle (30 min)</a></div>
        <p className="muted small">Les vidéos de démonstration, de vente et d&apos;onboarding pour présenter Cockpit&apos;ch et installer vos clients.</p>
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
        <h2>Mon dossier partenaire</h2>
        <DossierForm d={{ companyName: r.companyName, siret: r.siret, address: r.address, managerName: r.managerName, managerEmail: r.managerEmail, managerPhone: r.managerPhone, bic: r.bic, ibanLast4: r.ibanLast4 }} />
      </section>
    </div>
  );
}
