import { useState } from "react";
import type { Item } from "../types";
import { TYPE_LABELS, STATUS_LABELS } from "../types";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { ImageLightbox } from "./ImageLightbox";

// Read-only detail view for an item. Tap the cover to view it larger.
export function ItemDetail({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: Item;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
  useLockBodyScroll();
  const [zoom, setZoom] = useState(false);
  const fields = detailFields(item);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="card modal detail" onClick={(e) => e.stopPropagation()}>
          <div className="detail-header">
            {item.cover_url ? (
              <button
                type="button"
                className="detail-cover"
                onClick={() => setZoom(true)}
                title="View larger"
              >
                <img src={item.cover_url} alt="" />
              </button>
            ) : (
              <div className="detail-cover detail-cover-empty">
                {item.title.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="detail-headtext">
              <h2>{item.title}</h2>
              <p className="muted detail-type">{TYPE_LABELS[item.type].replace(/s$/, "")}</p>
              <p className="detail-badges">
                <span className={`status status-${item.status}`}>{STATUS_LABELS[item.status]}</span>
                {item.rating ? <span className="rating">{"★".repeat(item.rating)}</span> : null}
              </p>
            </div>
          </div>

          {fields.length > 0 && (
            <dl className="detail-fields">
              {fields.map((f) => (
                <div key={f.label} className="detail-row">
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {item.notes && (
            <div className="detail-notes">
              <dt>Notes</dt>
              <dd>{item.notes}</dd>
            </div>
          )}

          <div className="modal-actions detail-actions">
            <button type="button" className="ghost danger" onClick={() => onDelete(item)}>
              Delete
            </button>
            <span className="spacer" />
            <button type="button" className="ghost" onClick={onClose}>
              Close
            </button>
            <button type="button" className="primary" onClick={() => onEdit(item)}>
              Edit
            </button>
          </div>
        </div>
      </div>
      {zoom && item.cover_url && (
        <ImageLightbox src={item.cover_url} onClose={() => setZoom(false)} />
      )}
    </>
  );
}

function detailFields(item: Item): { label: string; value: string }[] {
  const f: { label: string; value: string }[] = [];
  if (item.type === "game") {
    if (item.publisher) f.push({ label: "Publisher", value: item.publisher });
    if (item.platform) f.push({ label: "Platform", value: item.platform });
    if (!item.publisher && !item.platform && item.creator)
      f.push({ label: "Developer", value: item.creator });
  } else if (item.creator) {
    f.push({ label: item.type === "book" ? "Author" : "Director", value: item.creator });
  }
  if (item.type === "movie" && item.format) f.push({ label: "Format", value: item.format });
  if (item.year) f.push({ label: "Year", value: String(item.year) });
  if (item.type === "book" && item.identifier) f.push({ label: "ISBN", value: item.identifier });
  return f;
}
