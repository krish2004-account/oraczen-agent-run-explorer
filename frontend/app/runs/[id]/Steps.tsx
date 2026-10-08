"use client";
import { useEffect, useState } from "react";
import { Step, fmtMs } from "@/lib/api";

export default function Steps({ steps, errorIndex }: { steps: Step[]; errorIndex: number | null }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  useEffect(() => { // deep link: /runs/run_0042#step-3 opens that step
    const m = window.location.hash.match(/^#step-(\d+)$/);
    if (m) { const i = Number(m[1]); setOpen(new Set([i])); setTimeout(() => document.getElementById(`step-${i}`)?.scrollIntoView(), 0); }
  }, []);
  if (!steps.length) return <p className="mut">This run has no recorded steps.</p>;
  return <>{steps.map(s => (
    <details key={s.index} id={`step-${s.index}`} className="step" open={open.has(s.index)}
      onToggle={e => { const o = (e.target as HTMLDetailsElement).open; setOpen(p => { const n = new Set(p); o ? n.add(s.index) : n.delete(s.index); return n; }); }}>
      <summary><b>#{s.index}</b><span>{s.name}</span><span className="mut">{s.tool}</span>
        <span className={s.status}>{s.status}</span><span className="mut">{fmtMs(s.duration_ms)}</span>
        <span className="mut">{s.tokens.input}→{s.tokens.output} tok</span>
        {errorIndex === s.index && <span className="failed">⚠ error here</span>}</summary>
      <div><label>Input</label><pre>{s.input}</pre><label>Output</label><pre>{s.output ?? "(no output)"}</pre></div>
    </details>))}</>;
}
