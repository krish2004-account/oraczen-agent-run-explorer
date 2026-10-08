import Link from "next/link";
import { notFound } from "next/navigation";
import Explain from "./Explain";
import Steps from "./Steps";
import { API, Run, fmtMs, fmtCost } from "@/lib/api";

export default async function RunPage({ params }: { params: { id: string } }) {
  const res = await fetch(`${API}/api/runs/${encodeURIComponent(params.id)}`, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`API ${res.status}`);
  const r: Run = await res.json();
  return (
    <>
      <p><Link href="/runs">← All runs</Link></p>
      <div className="card">
        <h2 style={{ margin: 0 }}>{r.id} <span className={`badge ${r.status}`}>{r.status}</span></h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{r.prompt}</p>
        <p className="mut">{r.agent} · {r.model} · {r.tenant_id} · started {r.started_at} · duration {fmtMs(r.duration_ms)} · cost {fmtCost(r.cost_usd)} · {r.input_tokens}→{r.output_tokens} tokens</p>
        {r.anomalies.length > 0 && <p className="pill">Data notes: {r.anomalies.join(", ")}</p>}
      </div>
      {r.error && <div className="card err"><b className="failed">{r.error.type}</b> at step {r.error.step_index}<p>{r.error.message}</p></div>}
      <Explain id={r.id} />
      <h3>Steps ({r.steps.length})</h3>
      <Steps steps={r.steps} errorIndex={r.error?.step_index ?? null} />
    </>
  );
}
