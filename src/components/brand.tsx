// Logo Cockpit'ch : une bulle de pitch qui contient le cadran d'un cockpit.
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6.5L8 20.5V17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
        <path d="M7.5 14a4.5 4.5 0 0 1 9 0" />
        <path d="M12 14l2.8-3.2" strokeWidth="2.2" />
        <circle cx="12" cy="14" r="0.6" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Brand({ sub = "Prospection B2B" }: { sub?: string }) {
  return (
    <span className="brand">
      <BrandMark />
      <span>
        <b>Cockpit<span className="brand-ch">&apos;ch</span></b>
        <span className="brand-sub">{sub}</span>
      </span>
    </span>
  );
}
