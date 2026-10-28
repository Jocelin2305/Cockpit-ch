"use client";

import { useTransition } from "react";
import { setStatus } from "@/app/app/prospects/actions";
import { STATUSES } from "@/lib/prospecting";

type Props = { id: string; status: string; label: string };

// La clé suit le statut enregistré : le menu se resynchronise quand le serveur le change (J0 envoyé, relance…).
export function StatusSelect(props: Props) {
  return <StatusSelectInner key={props.status} {...props} />;
}

function StatusSelectInner({ id, status, label }: Props) {
  const [pending, start] = useTransition();
  return (
    <select
      className="input sm"
      aria-label={`Statut de ${label}`}
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(() => setStatus(id, next));
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
