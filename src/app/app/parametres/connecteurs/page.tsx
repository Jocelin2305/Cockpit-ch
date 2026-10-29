import { redirect } from "next/navigation";

// Les connecteurs sont présentés en vignettes directement dans Paramètres.
export default function ConnectorsPage() {
  redirect("/app/parametres");
}
