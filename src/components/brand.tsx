// Logo Cockpit'ch : un simple « C' ».
export function BrandMark() {
  return <span className="brand-mark" aria-hidden="true">C&apos;</span>;
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
