import { useState } from "react";
import type { LookupResult } from "../lib/lookup";

// A "search a provider, pick a result to auto-fill" box.
// Used for movies (TMDB) and games (RAWG).
export function LookupBox({
  label,
  placeholder,
  search,
  resolve,
  onPick,
}: {
  label: string;
  placeholder: string;
  search: (q: string) => Promise<LookupResult[]>;
  resolve?: (r: LookupResult) => Promise<LookupResult>;
  onPick: (r: LookupResult) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<LookupResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const r = await search(q.trim());
      setResults(r);
      if (r.length === 0) setError("No matches found.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pick(r: LookupResult) {
    setBusy(true);
    try {
      onPick(resolve ? await resolve(r) : r);
    } catch {
      onPick(r); // details are optional; fill what we already have
    } finally {
      setBusy(false);
      setResults(null);
      setQ("");
    }
  }

  return (
    <div className="isbn-lookup">
      <label>
        {label}
        <div className="isbn-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder={placeholder}
          />
          <button type="button" className="ghost" onClick={runSearch} disabled={busy || !q.trim()}>
            {busy ? "…" : "Search"}
          </button>
        </div>
      </label>

      {error && <p className="error">{error}</p>}

      {results && results.length > 0 && (
        <ul className="lookup-results">
          {results.map((r) => (
            <li key={r.sourceId}>
              <button type="button" className="lookup-result" onClick={() => pick(r)}>
                {r.cover_url ? (
                  <img src={r.cover_url} alt="" loading="lazy" />
                ) : (
                  <span className="lookup-thumb-placeholder">{r.title.slice(0, 1)}</span>
                )}
                <span className="lookup-result-text">
                  <strong>{r.title}</strong>
                  {r.year ? <span className="muted"> ({r.year})</span> : null}
                  {r.creator ? <span className="muted lookup-creator">{r.creator}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
