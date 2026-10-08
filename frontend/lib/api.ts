export const API = process.env.API_URL ?? "http://localhost:8000";
export const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type RunSummary = {
  id: string; agent: string; model: string; status: string; started_at: string;
  ended_at: string | null; duration_ms: number | null; cost_usd: number | null;
  prompt: string; error: { type: string; message: string; step_index: number } | null;
  tenant_id: string; step_count: number; anomalies: string[];
};
export type Step = {
  index: number; name: string; tool: string; status: string; started_at: string;
  duration_ms: number | null; input: string; output: string | null; tokens: { input: number; output: number };
};
export type Run = Omit<RunSummary, "step_count"> & { input_tokens: number; output_tokens: number; steps: Step[] };
export type RunsPage = { total: number; page: number; page_size: number; items: RunSummary[] };

export const AGENTS = ["contract-reviewer", "email-drafter", "invoice-extractor", "kpi-analyst", "support-router"];
export const STATUSES = ["succeeded", "failed", "cancelled", "running"];

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
export const fmtMs = (ms: number | null) => (ms == null ? "—" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
export const fmtCost = (c: number | null) => (c == null ? "unpriced" : `$${c.toFixed(4)}`);
