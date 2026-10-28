import { z } from "zod";

export const emailField = z.string().trim().toLowerCase().pipe(z.email({ error: "Adresse email invalide." }));
export const passwordField = z
  .string()
  .min(10, { error: "Le mot de passe doit contenir au moins 10 caractères." })
  .max(200, { error: "Mot de passe trop long." });
export const nameField = z
  .string()
  .trim()
  .min(2, { error: "Le nom doit contenir au moins 2 caractères." })
  .max(80, { error: "Nom trop long (80 caractères maximum)." });

export const signupSchema = z.object({
  name: nameField,
  email: emailField,
  company: nameField,
  password: passwordField,
});

export const inviteSchema = z.object({
  email: emailField,
  role: z.enum(["ADMIN", "MEMBER"], { error: "Rôle inconnu." }),
});

// État renvoyé par les formulaires : un message d'erreur ou de succès, et les valeurs saisies.
export type FormState =
  | { error?: string; ok?: string; link?: string; values?: Record<string, string> }
  | undefined;

export const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Formulaire invalide.";
