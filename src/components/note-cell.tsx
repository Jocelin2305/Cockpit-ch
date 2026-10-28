"use client";

import { useState, useTransition } from "react";
import { saveNote } from "@/app/app/prospects/actions";

// Note manuelle d'une ligne de prospect : enregistrée en quittant le champ.
export function NoteCell({ id, notes }: { id: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(notes);
  const [pending, start] = useTransition();
  return (
    <textarea
      className={`input note-cell${pending ? " saving" : ""}`}
      rows={2}
      value={value}
      placeholder="Ajouter une note…"
      aria-label="Note"
      data-tip="Notez ici toute info utile sur ce prospect : elle est enregistrée dès que vous cliquez ailleurs."
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== saved && start(async () => { await saveNote(id, value); setSaved(value); })}
    />
  );
}
