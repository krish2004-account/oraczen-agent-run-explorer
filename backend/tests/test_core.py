import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from datetime import date
from app import core

DATA = pathlib.Path(__file__).resolve().parents[2] / "data" / "runs.jsonl"
RUNS, WARN = core.load_runs(DATA)


def test_filters_compose():
    total, items = core.query(RUNS, agent=["kpi-analyst", "email-drafter"], status=["failed"],
                              start=date(2026, 8, 1), end=date(2026, 8, 15), page_size=100)
    assert total == len(items) > 0
    assert all(i["agent"] in ("kpi-analyst", "email-drafter") and i["status"] == "failed"
               and "2026-08-01" <= i["started_at"][:10] <= "2026-08-15" for i in items)
    only_status, _ = core.query(RUNS, status=["failed"])
    assert total < only_status  # each added filter narrows


def test_duplicate_and_dedupe():
    assert len(RUNS) == 200 and RUNS["run_0031"]["status"] == "succeeded"
    assert any("run_0031" in w for w in WARN)


def test_negative_duration_not_used():
    assert RUNS["run_0064"]["duration_ms"] is None and "negative_duration" in RUNS["run_0064"]["anomalies"]


def test_stats_by_hand():
    s = core.stats(RUNS)
    assert s["overall"]["runs"] == 200
    assert core.median([1, 3, 2]) == 2 and core.median([1, 2, 3, 4]) == 2.5
    assert core.percentile(list(range(1, 101)), 95) == 95  # nearest-rank
    # success rate: succeeded / finished (running excluded); recompute independently
    fin = [r for r in RUNS.values() if r["status"] != "running"]
    expected = sum(r["status"] == "succeeded" for r in fin) / len(fin)
    assert abs(s["overall"]["success_rate"] - round(expected, 4)) < 1e-9
    assert s["notes"]["unpriced_runs"] == 3


def test_null_sort_last_both_directions():
    for order in ("asc", "desc"):
        _, items = core.query(RUNS, sort="duration_ms", order=order, page_size=1000)
        vals = [i["duration_ms"] for i in items]
        first_none = vals.index(None)
        assert all(v is None for v in vals[first_none:])
