// Emails envoyés par la plateforme (invitations, mot de passe oublié) via Resend.
// Sans RESEND_API_KEY, rien ne part : l'interface affiche alors le lien à transmettre soi-même.

export const platformEmailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendPlatformEmail(to: string, subject: string, text: string) {
  if (!platformEmailEnabled()) {
    if (process.env.NODE_ENV !== "production") console.info(`[email non envoyé, Resend non configuré] À ${to} : ${subject}\n${text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
  }).catch(() => null);
  if (!res?.ok) console.error("Envoi d'email impossible :", res?.status);
  return Boolean(res?.ok);
}

// `brand` : la marque du distributeur pour ses clients (marque blanche).
const sign = (brand: string) => `\n\n—\n${brand} · prospection B2B`;

export const inviteEmail = (org: string, role: string, link: string, days: number, brand = "Cockpit'ch") => ({
  subject: `Invitation à rejoindre ${org} sur ${brand}`,
  text: `Bonjour,\n\nVous êtes invité(e) à rejoindre l'espace « ${org} » sur ${brand} en tant que ${role.toLowerCase()}.\n\nCréez votre accès ici (lien valable ${days} jours) :\n${link}${sign(brand)}`,
});

export const resetEmail = (link: string, minutes: number, brand = "Cockpit'ch") => ({
  subject: `Réinitialiser votre mot de passe ${brand}`,
  text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable ${minutes} minutes) :\n${link}\n\nVous n'êtes pas à l'origine de cette demande ? Ignorez cet email, votre mot de passe reste inchangé.${sign(brand)}`,
});
