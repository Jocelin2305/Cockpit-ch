import { brandCss, brandFontHref, type Brand } from "@/lib/branding";

// Couleurs et typographie du distributeur (marque blanche), injectées dans la page.
export function BrandStyle({ brand, hideDefault }: { brand: Brand | null; hideDefault?: boolean }) {
  if (!brand) return null;
  const font = brandFontHref(brand);
  return (
    <>
      {font && <link rel="stylesheet" href={font} />}
      <style dangerouslySetInnerHTML={{ __html: brandCss(brand) + (hideDefault ? " .auth-brand { display: none; }" : "") }} />
    </>
  );
}
