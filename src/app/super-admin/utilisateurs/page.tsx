import type { Metadata } from "next";
import { Overview } from "../overview";

export const metadata: Metadata = { title: "Utilisateurs" };

export default function Page() {
  return <Overview section="utilisateurs" />;
}
