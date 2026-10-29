import type { Metadata } from "next";
import { Overview } from "./overview";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default function Page() {
  return <Overview section="pilotage" />;
}
