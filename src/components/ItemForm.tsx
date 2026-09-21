import { useState, type FormEvent } from "react";
import type { Item, ItemDraft, ItemStatus, ItemType } from "../types";
import { STATUS_LABELS, CREATOR_LABELS, TYPE_LABELS } from "../types";
import { lookupIsbn } from "../lib/openlibrary";

const STATUSES: ItemStatus[] = ["owned", "wishlist", "in_progress", "done"];

export function ItemForm({
  type,
  initial,
  onCancel,
  onSave,
}: {
  type: ItemType;
  initial: Item | null;
  onCancel: () => void;
  onSave: (draft: ItemDraft, id?: string) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [creator, setCreator] = useState(initial?.creator ?? "");
  const [year, setYear] = useState(initial?.year?.toString() ?? "");
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? "owned");
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [identifier, setIdentifier] = useState(initial?.identifier ?? "");
  const [saving, setSaving] = useState(false);

  const [isbn, setIsbn] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function handleLookup() {
    setLookupBusy(true);
    setLookupError(null);
    try {
      const result = await lookupIsbn(isbn);
      if (result.title) setTitle(result.title);
      if (result.creator) setCreator(result.creator);
      if (result.year) setYear(String(result.year));
      if (result.cover_url) setCoverUrl(result.cover_url);
      setIdentifier(isbn.replace(/[^0-9Xx]/g, ""));
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const draft: ItemDraft = {
      type,
      title: title.trim(),
      creator: creator.trim() || null,
      year: year ? Number(year) : null,
      status,
      rating: rating || null,
      notes: notes.trim() || null,
      cover_url: coverUrl.trim() || null,
      identifier: identifier.trim() || null,
    };
    await onSave(draft, initial?.id);
    setSaving(false);
  }

  const singular = TYPE_LABELS[type].replace(/s$/, "");

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>
          {initial ? "Edit" : "Add"} {singular.toLowerCase()}
        </h2>

        {type === "book" && !initial && (
          <div className="isbn-lookup">
            <label>
              Look up by ISBN (optional)
              <div className="isbn-row">
                <input
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="9780…"
                  inputMode="numeric"
                />
                <button type="button" className="ghost" onClick={handleLookup} disabled={lookupBusy}>
                  {lookupBusy ? "…" : "Fill in"}
                </button>
              </div>
            </label>
            {lookupError && <p className="error">{lookupError}</p>}
          </div>
        )}

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>

        <label>
          {CREATOR_LABELS[type]}
          <input value={creator} onChange={(e) => setCreator(e.target.value)} />
        </label>

        <div className="row">
          <label>
            Year
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={1900}
              max={2100}
            />
          </label>

          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Rating
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              <option value={0}>—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Cover image URL
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
        </label>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
