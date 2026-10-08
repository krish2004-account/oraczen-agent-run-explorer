import asyncio, os


def _canned(run):
    steps = run.get("steps") or []
    names = ", ".join(s["name"] for s in steps) or "no recorded steps"
    text = (f"Run {run['id']} was handled by the {run['agent']} agent using {run['model']}. "
            f"It executed {len(steps)} step(s): {names}. ")
    e = run.get("error")
    if e:
        text += f"It ended '{run['status']}': {e['type']} - {e['message']} (step {e['step_index']}). "
        text += "Check that step's input and output for the root cause."
    elif run["status"] == "running":
        text += "It is still running, so there is no final outcome yet."
    else:
        text += f"It finished with status '{run['status']}' and no error."
    return text


async def stream_explanation(run):
    """Provider chosen by EXPLAIN_PROVIDER (default 'mock'). Add real providers here."""
    provider = os.getenv("EXPLAIN_PROVIDER", "mock")
    if provider != "mock":
        raise RuntimeError(f"Unknown EXPLAIN_PROVIDER '{provider}'")
    delay = float(os.getenv("MOCK_DELAY_SECONDS", "0.04"))
    for word in _canned(run).split(" "):
        await asyncio.sleep(delay)
        yield word + " "
