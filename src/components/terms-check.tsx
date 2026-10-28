import Link from "next/link";

// Case obligatoire à l'inscription et à l'acceptation d'une invitation.
export function TermsCheck() {
  return (
    <label className="check">
      <input type="checkbox" name="terms" required />
      <span>J&apos;accepte les <Link href="/cgu" target="_blank">conditions d&apos;utilisation</Link> et la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.</span>
    </label>
  );
}
