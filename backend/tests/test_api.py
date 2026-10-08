import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)


def test_list_has_total_and_no_steps():
    r = c.get("/api/runs?agent=kpi-analyst&agent=email-drafter&status=failed&sort=cost_usd&order=asc").json()
    assert r["total"] == len(r["items"]) or r["total"] > r["page_size"]
    assert all("steps" not in i for i in r["items"])


def test_404_and_bad_sort():
    assert c.get("/api/runs/nope").status_code == 404
    assert c.get("/api/runs?sort=bogus").status_code == 422


def test_explain_streams_with_mock():
    with c.stream("POST", "/api/runs/run_0042/explain") as r:
        body = "".join(r.iter_text())
    assert "run_0042" in body
