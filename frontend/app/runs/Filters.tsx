"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AGENTS, STATUSES } from "@/lib/api";

export default function Filters() {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const update = (fn: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    fn(p); p.delete("page"); // any filter change returns to page 1
    router.replace(`${path}?${p.toString()}`);
  };
  const toggle = (key: string, val: string) => update(p => {
    const cur = p.getAll(key); p.delete(key);
    (cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]).forEach(v => p.append(key, v));
  });
  const set = (key: string, val: string) => update(p => (val ? p.set(key, val) : p.delete(key)));
  // debounce search so we don't refetch on every keystroke
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set("q", q), 350);
    return () => clearTimeout(timer.current);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const group = (key: string, opts: string[]) => (
    <div><label>{key}</label>{opts.map(o => (
      <span className="chk" key={o}><input type="checkbox" checked={sp.getAll(key).includes(o)} onChange={() => toggle(key, o)} />{o}</span>
    ))}</div>
  );
  return (
    <div className="card">
      <div className="row">
        <div className="grow"><label>Search prompt</label><input style={{ width: "100%" }} value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. liability caps" /></div>
        <div><label>From</label><input type="date" value={sp.get("start") ?? ""} onChange={e => set("start", e.target.value)} /></div>
        <div><label>To</label><input type="date" value={sp.get("end") ?? ""} onChange={e => set("end", e.target.value)} /></div>
        <div><label>Sort</label>
          <select value={sp.get("sort") ?? "started_at"} onChange={e => set("sort", e.target.value)}>
            <option value="started_at">started</option><option value="duration_ms">duration</option><option value="cost_usd">cost</option>
          </select></div>
        <div><label>Order</label>
          <select value={sp.get("order") ?? "desc"} onChange={e => set("order", e.target.value)}>
            <option value="desc">desc</option><option value="asc">asc</option>
          </select></div>
        <button onClick={() => { setQ(""); router.replace(path); }}>Reset</button>
      </div>
      <div className="row" style={{ marginTop: 10 }}>{group("status", STATUSES)}{group("agent", AGENTS)}</div>
    </div>
  );
}
