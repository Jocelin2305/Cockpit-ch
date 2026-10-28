import type { Metadata } from "next";
import { EDITOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalNotice() {
  return (
    <>
      <h1>Mentions légales</h1>
      <h2>Éditeur</h2>
      <p>{EDITOR.name}, {EDITOR.form}<br />{EDITOR.siren} · TVA : {EDITOR.vat}<br />{EDITOR.address}<br />Contact : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a></p>
      <p>Directeur de la publication : {EDITOR.director}.</p>
      <h2>Hébergement</h2>
      <p>Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.<br />Base de données : Supabase Inc., données hébergées dans l&apos;Union européenne (région Paris).</p>
      <h2>Propriété intellectuelle</h2>
      <p>Le logiciel Cockpit&apos;ch, sa marque, son logo et ses contenus sont protégés. Toute reproduction sans autorisation est interdite.</p>
    </>
  );
}
