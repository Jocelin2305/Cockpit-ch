export function Brand({ sub = "Prospection B2B" }: { sub?: string }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 12 18 6" />
        </svg>
      </span>
      <span>
        <b>Cockpit</b>
        <span className="brand-sub">{sub}</span>
      </span>
    </span>
  );
}
