import type { Metadata } from "next";
import { Overview } from "../overview";

export const metadata: Metadata = { title: "Entreprises clientes" };

export default function Page() {
  return <Overview section="clients" />;
}
