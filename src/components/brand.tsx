// Logo Cockpit'ch (charte du prototype) : un cadran de tableau de bord.
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="M12 12 18 6" /></svg>
    </span>
  );
}

// Marque blanche : nom et logo du distributeur à la place de ceux de Cockpit'ch.
export function Brand({ sub = "Prospection B2B", brand }: { sub?: string; brand?: { name: string; logo: string } | null }) {
  return (
    <span className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {brand?.logo ? <img src={brand.logo} alt="" className="brand-logo" /> : <BrandMark />}
      <span>
        <b>{brand?.name ? brand.name : <>Cockpit<span className="brand-ch">&apos;ch</span></>}</b>
        <span className="brand-sub">{sub}</span>
      </span>
    </span>
  );
}
