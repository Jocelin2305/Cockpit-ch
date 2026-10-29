import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { VIDEO_CATEGORIES } from "@/lib/resellers";
import { deleteVideo } from "../actions";
import { VideoForm } from "../forms";

export const metadata: Metadata = { title: "Vidéos de formation" };

export default async function Page() {
  const { user } = await requireSuperAdmin();
  if (!user.isFounder) redirect("/super-admin");
  const videos = await db.resellerVideo.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="label">Partenaires</span>
          <h1>Vidéos de formation</h1>
        </div>
      </header>
      <section className="panel">
        <p className="muted small">Liens YouTube (non répertoriés de préférence) classés en démonstration, vente et onboarding.</p>
        <VideoForm />
        {VIDEO_CATEGORIES.map((c) => {
          const list = videos.filter((v) => v.category === c.id);
          return list.length ? (
            <div key={c.id}>
              <span className="label">{c.label}</span>
              <ul className="list">
                {list.map((v) => (
                  <li key={v.id} className="row between">
                    <a href={v.url} target="_blank" rel="noreferrer">{v.title}</a>
                    <form action={deleteVideo}><input type="hidden" name="id" value={v.id} /><button className="btn sm ghost" type="submit">Retirer</button></form>
                  </li>
                ))}
              </ul>
            </div>
          ) : null;
        })}
      </section>
    </div>
  );
}
