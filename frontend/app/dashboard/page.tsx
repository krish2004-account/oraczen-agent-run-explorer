import { getJSON } from "@/lib/api";
import { fmtMs } from "@/lib/api";

type Agent = { agent: string; runs: number; finished: number; running: number; success_rate: number | null; total_cost_usd: number; priced_runs: number; unpriced_runs: number };
type Stats = {
  overall: { runs: number; running: number; finished: number; success_rate: number | null };
  duration_ms: { median: number | null; p95: number | null; n: number; basis: string };
  per_agent: Agent[]; daily: { date: string; runs: number }[];
  notes: { scope: string; unpriced_runs: number }; data_warnings: string[];
};
const pct = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);

function Bars({ data, fmt }: { data: { label: string; value: number }[]; fmt: (n: number) => string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return <svg viewBox={`0 0 520 ${data.length * 28 + 6}`} width="100%">{data.map((d, i) => (
    <g key={d.label} transform={`translate(0 ${i * 28})`}>
      <text x="0" y="17" fill="#8b92b5" fontSize="12">{d.label}</text>
      <rect x="140" y="4" rx="4" height="16" width={(d.value / max) * 300} fill="#7c8cff" />
      <text x={148 + (d.value / max) * 300} y="17" fill="#e7e9f5" fontSize="12">{fmt(d.value)}</text>
    </g>))}</svg>;
}

export default async function Dashboard() {
  const s = await getJSON<Stats>("/api/stats");
  const maxDay = Math.max(...s.daily.map(d => d.runs), 1), W = 760, H = 140, bw = W / s.daily.length;
  return (
    <>
      <div className="kpis">
        <div className="card"><label>Runs</label><div className="v">{s.overall.runs}</div><span className="mut">{s.overall.running} still running</span></div>
        <div className="card"><label>Success rate</label><div className="v">{pct(s.overall.success_rate)}</div><span className="mut">of {s.overall.finished} finished runs</span></div>
        <div className="card"><label>Median duration</label><div className="v">{fmtMs(s.duration_ms.median)}</div><span className="mut">{s.duration_ms.basis}</span></div>
        <div className="card"><label>p95 duration</label><div className="v">{fmtMs(s.duration_ms.p95)}</div><span className="mut">n = {s.duration_ms.n}</span></div>
      </div>
      <div className="card"><b>Runs per day</b>
        <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%">{s.daily.map((d, i) => (
          <rect key={d.date} x={i * bw + 1} y={H - (d.runs / maxDay) * H} width={bw - 2} height={(d.runs / maxDay) * H} fill="#7c8cff"><title>{d.date}: {d.runs}</title></rect>))}
          <text x="0" y={H + 14} fill="#8b92b5" fontSize="11">{s.daily[0]?.date}</text>
          <text x={W} y={H + 14} fill="#8b92b5" fontSize="11" textAnchor="end">{s.daily.at(-1)?.date}</text></svg></div>
      <div className="row">
        <div className="card grow"><b>Success rate by agent</b>
          <Bars data={s.per_agent.map(a => ({ label: a.agent, value: (a.success_rate ?? 0) * 100 }))} fmt={n => `${n.toFixed(1)}%`} /></div>
        <div className="card grow"><b>Total cost by agent</b>
          <Bars data={s.per_agent.map(a => ({ label: a.agent, value: a.total_cost_usd }))} fmt={n => `$${n.toFixed(2)}`} />
          <p className="mut">Sums priced runs only; {s.notes.unpriced_runs} run(s) have no cost and are excluded, not counted as $0.</p></div>
      </div>
      <div className="card"><b>Data notes</b><ul>{s.data_warnings.map(w => <li key={w} className="mut">{w}</li>)}</ul><p className="mut">Stats scope: {s.notes.scope}.</p></div>
    </>
  );
}
