import Link from "next/link";
import { Suspense } from "react";
import Filters from "./Filters";
import { getJSON, fmtMs, fmtCost, RunsPage } from "@/lib/api";

type SP = Record<string, string | string[] | undefined>;

export default async function RunsPage({ searchParams }: { searchParams: SP }) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) [v ?? []].flat().forEach(x => p.append(k, x));
  const page = Math.max(1, Number(p.get("page") ?? 1) || 1);
  const data = await getJSON<RunsPage>(`/api/runs?${p.toString()}`);
  const first = data.total ? (data.page - 1) * data.page_size + 1 : 0;
  const last = Math.min(data.total, data.page * data.page_size);
  const href = (n: number) => { const q = new URLSearchParams(p); q.set("page", String(n)); return `/runs?${q}`; };
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));

  return (
    <>
      <Suspense><Filters /></Suspense>
      <div className="card">
        {data.items.length === 0 ? (
          <p className="mut">No runs match these filters. Try resetting them.</p>
        ) : (
          <table>
            <thead><tr><th>Run</th><th>Agent</th><th>Status</th><th>Started</th><th className="num">Duration</th><th className="num">Cost</th><th>Prompt</th></tr></thead>
            <tbody>{data.items.map(r => (
              <tr key={r.id}>
                <td><Link href={`/runs/${r.id}`}>{r.id}</Link>{r.anomalies.filter(a => a !== "unpriced").length > 0 && <span className="pill" title={r.anomalies.join(", ")}>⚠ data</span>}</td>
                <td>{r.agent}</td><td className={r.status}>{r.status}</td>
                <td className="mut">{r.started_at.slice(0, 16).replace("T", " ")}</td>
                <td className="num">{fmtMs(r.duration_ms)}</td><td className="num">{fmtCost(r.cost_usd)}</td>
                <td>{r.prompt.trim().slice(0, 70)}</td>
              </tr>))}</tbody>
          </table>
        )}
        <div className="pager" style={{ marginTop: 12 }}>
          <span className="mut">Showing {first}–{last} of {data.total}</span>
          <span>{page > 1 ? <Link href={href(page - 1)}>← Prev</Link> : <span className="mut">← Prev</span>}
            {" · "}Page {page}/{pages}{" · "}
            {page < pages ? <Link href={href(page + 1)}>Next →</Link> : <span className="mut">Next →</span>}</span>
        </div>
      </div>
    </>
  );
}
