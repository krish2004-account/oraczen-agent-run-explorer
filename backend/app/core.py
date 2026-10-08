"""Pure data logic (no web framework): loading, querying, stats."""
import json, math, logging
from datetime import datetime, date, timezone
from pathlib import Path

log = logging.getLogger("runs")
FINISHED = {"succeeded", "failed", "cancelled"}  # everything except "running"


def _ts(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def load_runs(path):
    """Load JSONL. Returns (runs_by_id_in_order, warnings). Never silently drops data."""
    runs, warnings = {}, []
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError as e:
            warnings.append(f"line {n}: invalid JSON ({e}); skipped")
            continue
        r["anomalies"] = []
        rid = r["id"]
        if rid in runs:
            old = runs[rid]
            # Conflicting duplicate: a terminal status beats "running" (a run cannot un-finish).
            keep, drop = (old, r) if old["status"] in FINISHED or r["status"] == "running" else (r, old)
            keep["anomalies"].append("duplicate_id")
            runs[rid] = keep
            warnings.append(f"{rid}: duplicate id (statuses {old['status']}/{r['status']}); kept '{keep['status']}'")
            continue
        d = r.get("duration_ms")
        if d is not None and d < 0:
            r["anomalies"].append("negative_duration")
            r["duration_ms"] = None  # untrustworthy: excluded from duration stats/sorts
            warnings.append(f"{rid}: negative duration ({d} ms); treated as unknown")
        if not r.get("steps"):
            r["anomalies"].append("no_steps")
        e = r.get("error")
        if e and e.get("step_index") is not None and e["step_index"] >= len(r.get("steps") or []):
            r["anomalies"].append("error_step_out_of_range")
        if r.get("cost_usd") is None:
            r["anomalies"].append("unpriced")
        runs[rid] = r
    return runs, warnings


def summary(r):
    """List view: everything except the steps array."""
    s = {k: v for k, v in r.items() if k != "steps"}
    s["step_count"] = len(r.get("steps") or [])
    return s


SORTS = {"started_at", "duration_ms", "cost_usd"}


def query(runs, *, status=None, agent=None, tool=None, start=None, end=None, q=None,
          sort="started_at", order="desc", page=1, page_size=25):
    rows = list(runs.values())
    if status: rows = [r for r in rows if r["status"] in status]
    if agent: rows = [r for r in rows if r["agent"] in agent]
    if tool: rows = [r for r in rows if any(s["tool"] in tool for s in r.get("steps") or [])]
    if start: rows = [r for r in rows if _ts(r["started_at"]).date() >= start]
    if end: rows = [r for r in rows if _ts(r["started_at"]).date() <= end]
    if q:
        ql = q.strip().lower()
        rows = [r for r in rows if ql in (r.get("prompt") or "").lower()]
    if sort not in SORTS:
        raise ValueError(f"sort must be one of {sorted(SORTS)}")
    rev = order == "desc"
    present = [r for r in rows if r.get(sort) is not None]
    missing = [r for r in rows if r.get(sort) is None]  # nulls always last, either direction
    key = (lambda r: _ts(r["started_at"])) if sort == "started_at" else (lambda r: r[sort])
    present.sort(key=lambda r: (key(r), r["id"]), reverse=rev)
    rows = present + sorted(missing, key=lambda r: r["id"])
    total = len(rows)
    off = (page - 1) * page_size
    return total, [summary(r) for r in rows[off:off + page_size]]


def percentile(vals, p):
    """Nearest-rank percentile."""
    v = sorted(vals)
    if not v: return None
    return v[max(1, math.ceil(p / 100 * len(v))) - 1]


def median(vals):
    v = sorted(vals)
    if not v: return None
    m = len(v) // 2
    return v[m] if len(v) % 2 else (v[m - 1] + v[m]) / 2


def stats(runs):
    rows = list(runs.values())
    def block(rs):
        fin = [r for r in rs if r["status"] in FINISHED]
        ok = sum(r["status"] == "succeeded" for r in fin)
        return {"runs": len(rs), "running": len(rs) - len(fin), "finished": len(fin),
                "success_rate": round(ok / len(fin), 4) if fin else None}
    agents = sorted({r["agent"] for r in rows})
    per_agent = []
    for a in agents:
        rs = [r for r in rows if r["agent"] == a]
        priced = [r["cost_usd"] for r in rs if r["cost_usd"] is not None]
        per_agent.append({"agent": a, **block(rs), "total_cost_usd": round(sum(priced), 6),
                          "priced_runs": len(priced), "unpriced_runs": len(rs) - len(priced)})
    # Duration stats: completed (succeeded) runs with a trustworthy duration.
    durs = [r["duration_ms"] for r in rows if r["status"] == "succeeded" and r.get("duration_ms") is not None]
    days = {}
    for r in rows:
        d = _ts(r["started_at"]).date()
        days[d] = days.get(d, 0) + 1
    daily = []
    if days:
        d, last = min(days), max(days)
        while d <= last:
            daily.append({"date": d.isoformat(), "runs": days.get(d, 0)})
            d = date.fromordinal(d.toordinal() + 1)
    return {"overall": block(rows),
            "duration_ms": {"median": median(durs), "p95": percentile(durs, 95), "n": len(durs),
                            "basis": "succeeded runs with a valid duration"},
            "per_agent": per_agent, "daily": daily,
            "notes": {"scope": "global (ignores list filters)",
                      "unpriced_runs": sum(r["cost_usd"] is None for r in rows)}}
