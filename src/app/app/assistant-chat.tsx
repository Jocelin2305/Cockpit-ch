"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";

type Turn = { role: "user" | "assistant"; content: string; actions?: string[]; error?: boolean };

export function AssistantChat({ suggestions, aiReady, intro }: { suggestions: string[]; aiReady: boolean; intro?: React.ReactNode }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [turns]);

  // Touche « / » : place le curseur dans la barre de saisie.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...turns.filter((t) => !t.error && t.content), { role: "user" as const, content }];
    setTurns([...turns, { role: "user", content }, { role: "assistant", content: "", actions: [] }]);
    setInput("");
    setBusy(true);
    ctl.current = new AbortController();
    const patch = (fn: (t: Turn) => Turn) => setTurns((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);
    let changed = false;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-30).map(({ role, content: c }) => ({ role, content: c })) }),
        signal: ctl.current.signal,
      });
      if (!res.ok || !res.body) throw new Error(res.status === 401 ? "Votre session a expiré : reconnectez-vous." : "L'assistant n'a pas répondu.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { type: string; delta?: string; label?: string; message?: string };
          if (ev.type === "text") patch((t) => ({ ...t, content: t.content + (ev.delta ?? "") }));
          else if (ev.type === "action") { changed = true; patch((t) => ({ ...t, actions: [...(t.actions ?? []), ev.label ?? ""] })); }
          else if (ev.type === "error") patch((t) => ({ ...t, content: t.content || (ev.message ?? ""), error: !t.content }));
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) patch((t) => ({ ...t, content: t.content || (e instanceof Error ? e.message : "Erreur"), error: !t.content }));
    } finally {
      setBusy(false);
      ctl.current = null;
      if (changed) router.refresh();
    }
  };

  return (
    <div className="chat">
      <div className="chat-log" aria-live="polite">
        {intro && (
          <>
            <div className="msg user">Fais-moi le point du jour</div>
            <div className="msg ai briefing-msg" data-tour="briefing">{intro}</div>
          </>
        )}
        {turns.length === 0 && (
          <>
            <div className="msg ai">
              <p>{intro ? "Et maintenant ? Dites-moi" : <><b>Bonjour !</b> Dites-moi</>} ce que vous voulez faire : relancer, préparer un email, ajouter des prospects, rédiger les angles, analyser une recherche… Je m&apos;en occupe directement dans l&apos;outil.</p>
              {!aiReady && <p className="alert">L&apos;IA n&apos;est pas encore disponible : contactez le support.</p>}
            </div>
            <div className="sugg">
              {suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)} disabled={!aiReady}>{s}</button>)}
            </div>
          </>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`msg ${t.role === "user" ? "user" : "ai"}${t.error ? " err" : ""}`}>
            {t.role === "user" ? t.content : t.content ? <Markdown text={t.content} /> : <p className="muted">Réflexion…</p>}
            {!!t.actions?.length && <div className="acts">{t.actions.map((a, j) => <span key={j} className="chip ok">✓ {a}</span>)}</div>}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form className="chat-bar" data-tour="assistant" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          placeholder="« Quelles relances dois-je faire aujourd'hui ? », « Ajoute la société Durand Logistique à Lyon »…"
          aria-label="Message à l'assistant"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
        />
        {turns.length > 0 && !busy && <button type="button" className="btn sm ghost" onClick={() => setTurns([])}>Nouvelle conversation</button>}
        {busy ? (
          <button type="button" className="btn" onClick={() => ctl.current?.abort()}>Arrêter</button>
        ) : (
          <button type="submit" className="btn primary" disabled={!input.trim()}>Envoyer</button>
        )}
      </form>
    </div>
  );
}
