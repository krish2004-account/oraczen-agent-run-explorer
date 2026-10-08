# Decisions

**1. Null cost.** Total cost per agent sums *priced* runs only. Unpriced runs are never treated as $0; the API returns `priced_runs`/`unpriced_runs` and the dashboard states how many were excluded. Three runs are unpriced (run_0008, run_0042, run_0153).

**2. Running runs.** They have no duration, so they sort last in both directions (nulls last, tie-break by id). Success rate = succeeded / finished, where finished = succeeded + failed + cancelled; running runs are excluded from the denominator (they have no outcome yet) but counted in run totals. Cancelled counts as not-succeeded.

**3. Bad record.** `run_0031` appears twice (`succeeded` vs `running`, same start). I keep the terminal one (a run cannot un-finish), flag it `duplicate_id`, and surface a warning in `/api/stats`. `run_0064` has a negative duration (ended before started): duration is treated as unknown, excluded from duration stats and sorts, and flagged `negative_duration`. `run_0089` has an empty `steps` array yet an error at step 3: flagged `no_steps` / `error_step_out_of_range`. Nothing is silently dropped; source data is untouched.

**4. Stats scope.** `/api/stats` is always global (ignores list filters). Duration stats use succeeded runs with a valid duration, nearest-rank p95. The dashboard says so.

## Other notes
Prompt search is a case-insensitive substring match on the raw prompt (French and padded prompts included). Dates filter on the UTC date of `started_at`. Search is debounced 350 ms so typing does not refetch per keystroke. Mock explainer streams word-by-word.

## Not done / next
- Frontend tests: skipped for time. I would test URL-param round-tripping in `Filters` and that `Explain` appends streamed chunks.
- `test_api.py` could not be executed where this was written (no network to install FastAPI); `test_core.py` (filter composition, hand-computed stats, dedupe, null sorting) was run and passes. Run `pytest` once on your machine.
- Frontend was not built or run here either (no npm registry access). Run `npm install && npm run build` first.
- Not built: tool filter UI (backend supports `?tool=`), keyboard navigation, request indicator, cursor pagination, Docker Compose.
- At 20M rows: replace in-memory scan with a database (indexes on status, agent, started_at), keyset pagination, pre-aggregated stats.
- Least happy with: untested frontend, and the dashboard charts are plain SVG without axes.
