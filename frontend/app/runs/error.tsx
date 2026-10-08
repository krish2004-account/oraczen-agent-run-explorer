"use client";
export default function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card err">
      <b>Could not load runs.</b>
      <p className="mut">{error.message}</p>
      <p className="mut">Is the API running on port 8000?</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
