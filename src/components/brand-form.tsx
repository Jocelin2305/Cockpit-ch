"use client";
/* eslint-disable @next/next/no-img-element -- logos en data URL, non optimisables par next/image */

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { ColorWheel } from "@/components/color-wheel";
import { BRAND_FONTS } from "@/lib/reseller-offers";
import type { FormState } from "@/lib/validation";

type Initial = { brandName: string; brandLogo: string; brandColor: string; brandColor2: string; brandFont: string };

// Réduit le logo (256 px de large au plus) avant l'envoi.
async function shrink(file: File) {
  if (file.type === "image/svg+xml") return new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(file); });
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 256 / img.width);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

// Pack de marque : nom, logo, couleur forte, couleur douce, typographie, avec aperçu.
export function BrandForm({ action, initial, resellerId }: { action: (s: FormState, f: FormData) => Promise<FormState>; initial: Initial; resellerId?: string }) {
  const [state, run] = useActionState(action, undefined);
  const [name, setName] = useState(initial.brandName);
  const [logo, setLogo] = useState(initial.brandLogo);
  const [color, setColor] = useState(initial.brandColor || "#0e5a55");
  const [color2, setColor2] = useState(initial.brandColor2 || "#dcebe7");
  const [font, setFont] = useState(initial.brandFont);
  const [removed, setRemoved] = useState(false);
  return (
    <form action={run} className="stack">
      {resellerId && <input type="hidden" name="resellerId" value={resellerId} />}
      <input type="hidden" name="brandLogo" value={logo === initial.brandLogo ? "" : logo} />
      <input type="hidden" name="removeLogo" value={removed ? "1" : ""} />
      <input type="hidden" name="brandColor" value={color} />
      <input type="hidden" name="brandColor2" value={color2} />
      <div className="grid2">
        <label className="field">
          <span className="label-text">Nom de votre plateforme</span>
          <input className="input" name="brandName" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Prospect'In" />
        </label>
        <label className="field">
          <span className="label-text">Typographie</span>
          <select className="input" name="brandFont" value={font} onChange={(e) => setFont(e.target.value)}>
            {BRAND_FONTS.map((f) => <option key={f} value={f}>{f || "Celle de Cockpit'ch"}</option>)}
          </select>
        </label>
      </div>
      <div className="field">
        <span className="label-text">Logo (PNG, JPG ou SVG)</span>
        <div className="row">
          {logo && !removed && <img src={logo} alt="" className="brand-logo-preview" />}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setLogo(await shrink(f)); setRemoved(false); } }} />
          {logo && !removed && <button type="button" className="btn sm ghost" onClick={() => setRemoved(true)}>Retirer le logo</button>}
        </div>
      </div>
      <div className="grid2">
        <ColorWheel label="Couleur forte (boutons, liens)" value={color} onChange={setColor} />
        <ColorWheel label="Couleur douce (fonds, sélection)" value={color2} onChange={setColor2} />
      </div>
      <div className="brand-preview" style={{ fontFamily: font ? `"${font}", sans-serif` : undefined }}>
        {font && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700&display=swap`} />}
        <span className="label">Aperçu</span>
        <div className="row">
          {logo && !removed ? <img src={logo} alt="" className="brand-logo-preview" /> : <span className="brand-mark" style={{ background: color }} />}
          <b>{name || "Votre plateforme"}</b>
        </div>
        <div className="row">
          <span className="btn" style={{ background: color, borderColor: color, color: "#fff" }}>Bouton principal</span>
          <span className="chip" style={{ background: color2 }}>Sélection</span>
        </div>
      </div>
      <p className="muted small">Seuls le nom, le logo, les couleurs et la typographie changent ; le reste de la plateforme et ses mises à jour sont identiques. Les noms et logos de tiers (Anthropic, Claude, Apollo) sont interdits.</p>
      <SubmitButton pending="Enregistrement…">Enregistrer la marque</SubmitButton>
      <FormMessage error={state?.error} ok={state?.ok} />
    </form>
  );
}
