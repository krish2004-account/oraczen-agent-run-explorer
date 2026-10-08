import os
from datetime import date
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from . import core
from .explain import stream_explanation

DATA = Path(os.getenv("RUNS_FILE", Path(__file__).resolve().parents[2] / "data" / "runs.jsonl"))
app = FastAPI(title="Agent Run Explorer")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
                   allow_methods=["*"], allow_headers=["*"])
RUNS, WARNINGS = core.load_runs(DATA)


@app.get("/api/runs")
def list_runs(status: List[str] = Query(None), agent: List[str] = Query(None), tool: List[str] = Query(None),
              start: Optional[date] = None, end: Optional[date] = None, q: Optional[str] = None,
              sort: str = "started_at", order: str = Query("desc", pattern="^(asc|desc)$"),
              page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100)):
    try:
        total, items = core.query(RUNS, status=status, agent=agent, tool=tool, start=start, end=end, q=q,
                                  sort=sort, order=order, page=page, page_size=page_size)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@app.get("/api/runs/{run_id}")
def get_run(run_id: str):
    if run_id not in RUNS:
        raise HTTPException(404, f"Run '{run_id}' not found")
    return RUNS[run_id]


@app.get("/api/stats")
def get_stats():
    return {**core.stats(RUNS), "data_warnings": WARNINGS}


@app.post("/api/runs/{run_id}/explain")
async def explain(run_id: str):
    if run_id not in RUNS:
        raise HTTPException(404, f"Run '{run_id}' not found")
    return StreamingResponse(stream_explanation(RUNS[run_id]), media_type="text/plain; charset=utf-8")
