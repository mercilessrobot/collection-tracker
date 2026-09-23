import { useState, useRef, lazy, Suspense, type FormEvent, type ChangeEvent } from "react";
import type { Item, ItemDraft, ItemStatus, ItemType } from "../types";
import {
  STATUS_LABELS,
  CREATOR_LABELS,
  TYPE_LABELS,
  MOVIE_FORMATS,
  PLATFORM_GROUPS,
  PLATFORMS,
} from "../types";
import { lookupIsbn } from "../lib/openlibrary";
import { LookupBox } from "./LookupBox";
import { ScanButton } from "./ScanButton";
import type { LookupResult } from "../lib/lookup";
import { searchMovies, resolveMovie } from "../lib/tmdb";
import { searchGames, resolveGame } from "../lib/rawg";
import { upcToTitle } from "../lib/barcode";
import { hasTmdb, hasRawg } from "../config";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { uploadCover } from "../lib/storage";
import { normalizeImage } from "../lib/image";

const CropModal = lazy(() => import("./CropModal").then((m) => ({ default: m.CropModal })));

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
  onSave: (draft: ItemDraft, id?: string) => Promise<string | null>;
}) {
  useLockBodyScroll();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [creator, setCreator] = useState(initial?.creator ?? "");
  const [publisher, setPublisher] = useState(initial?.publisher ?? "");
  const [platform, setPlatform] = useState(initial?.platform ?? "");
  const [format, setFormat] = useState(initial?.format ?? "");
  const [year, setYear] = useState(initial?.year?.toString() ?? "");
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? "owned");
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [identifier, setIdentifier] = useState(initial?.identifier ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [isbn, setIsbn] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function handleLookup(code?: string) {
    const value = code ?? isbn;
    setLookupBusy(true);
    setLookupError(null);
    try {
      const result = await lookupIsbn(value);
      if (result.title) setTitle(result.title);
      if (result.creator) setCreator(result.creator);
      if (result.year) setYear(String(result.year));
      if (result.cover_url) setCoverUrl(result.cover_url);
      setIdentifier(value.replace(/[^0-9Xx]/g, ""));
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLookupBusy(false);
    }
  }

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setUploadError(null);
    try {
      const blob = await normalizeImage(file);
      setCropSrc(URL.createObjectURL(blob));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not open that image.");
    }
  }

  async function handleCropDone(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadCover(blob);
      setCoverUrl(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  // Fill the form fields from a picked search result (movies / games).
  function applyResult(r: LookupResult) {
    setTitle(r.title);
    if (r.creator) setCreator(r.creator);
    if (r.publisher) setPublisher(r.publisher);
    if (r.year) setYear(String(r.year));
    if (r.cover_url) setCoverUrl(r.cover_url);
    if (r.sourceId) setIdentifier(r.sourceId);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const draft: ItemDraft = {
      type,
      title: title.trim(),
      creator: creator.trim() || null,
      publisher: publisher.trim() || null,
      platform: platform.trim() || null,
      format: format.trim() || null,
      year: year ? Number(year) : null,
      status,
      rating: rating || null,
      notes: notes.trim() || null,
      cover_url: coverUrl.trim() || null,
      identifier: identifier.trim() || null,
    };
    const err = await onSave(draft, initial?.id);
    if (err) setSaveError(err);
    setSaving(false);
  }

  const singular = TYPE_LABELS[type].replace(/s$/, "");

  return (
    <>
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
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleLookup()}
                  disabled={lookupBusy}
                >
                  {lookupBusy ? "…" : "Fill in"}
                </button>
                <ScanButton
                  onDetected={(code) => {
                    setIsbn(code);
                    handleLookup(code);
                  }}
                  title="Scan book barcode"
                />
              </div>
            </label>
            {lookupError && <p className="error">{lookupError}</p>}
          </div>
        )}

        {type === "movie" &&
          (hasTmdb ? (
            <LookupBox
              label="Search movies to auto-fill (TMDB)"
              placeholder="e.g. Blade Runner"
              search={searchMovies}
              resolve={resolveMovie}
              onPick={applyResult}
              resolveScan={upcToTitle}
            />
          ) : (
            <p className="muted lookup-hint">
              Add a free TMDB key in <code>src/config.ts</code> to search &amp; auto-fill movies.
            </p>
          ))}

        {type === "game" &&
          (hasRawg ? (
            <LookupBox
              label="Search games to auto-fill (RAWG)"
              placeholder="e.g. The Legend of Zelda"
              search={searchGames}
              resolve={resolveGame}
              onPick={applyResult}
              resolveScan={upcToTitle}
            />
          ) : (
            <p className="muted lookup-hint">
              Add a free RAWG key in <code>src/config.ts</code> to search &amp; auto-fill games.
            </p>
          ))}

        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        {type === "game" ? (
          <div className="row">
            <label>
              Publisher
              <input value={publisher} onChange={(e) => setPublisher(e.target.value)} />
            </label>
            <label>
              Platform
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="">—</option>
                {platform && !PLATFORMS.includes(platform) && (
                  <option value={platform}>{platform}</option>
                )}
                {PLATFORM_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <label>
            {CREATOR_LABELS[type]}
            <input value={creator} onChange={(e) => setCreator(e.target.value)} />
          </label>
        )}

        {type === "movie" && (
          <label>
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">—</option>
              {MOVIE_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        )}

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

        <div className="field">
          <span className="field-label">Cover</span>
          <div className="cover-field">
            <div className="cover-preview">
              {coverUrl ? (
                <img src={coverUrl} alt="" />
              ) : (
                <span className="cover-preview-empty">No image</span>
              )}
            </div>
            <div className="cover-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "📷 Photo"}
              </button>
              {coverUrl && (
                <button type="button" className="ghost small" onClick={() => setCoverUrl("")}>
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-file"
              onChange={handlePhoto}
            />
          </div>
          {uploadError && <p className="error">{uploadError}</p>}
        </div>

        <label className="url-fallback">
          …or paste an image URL
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
        </label>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        {saveError && <p className="error">{saveError}</p>}
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
    {cropSrc && (
      <Suspense fallback={null}>
        <CropModal src={cropSrc} onCancel={handleCropCancel} onDone={handleCropDone} />
      </Suspense>
    )}
    </>
  );
}
