"use client";
import { useState } from "react";
import { PUBLIC_API } from "@/lib/api";

export default function Explain({ id }: { id: string }) {
  const [text, setText] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  async function run() {
    setText(""); setErr(""); setBusy(true);
    try {
      const res = await fetch(`${PUBLIC_API}/api/runs/${id}/explain`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader(), dec = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; setText(t => t + dec.decode(value, { stream: true })); }
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  }
  return (
    <div className="card">
      <button onClick={run} disabled={busy}>{busy ? "Explaining…" : "Explain this run"}</button>
      {err && <p className="failed">Explain failed: {err}</p>}
      {text && <p>{text}</p>}
    </div>
  );
}
