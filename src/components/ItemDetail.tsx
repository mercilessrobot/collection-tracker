import { useState, useEffect } from "react";
import type { Item, Market } from "../types";
import { TYPE_LABELS, STATUS_LABELS, CONDITION_LABELS } from "../types";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { ImageLightbox } from "./ImageLightbox";
import { formatMoney, headlineValue } from "../lib/pricecharting";

// Read-only detail view for an item. Tap the cover to view it larger.
export function ItemDetail({
  item,
  onClose,
  onEdit,
  onRefreshValue,
}: {
  item: Item;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onRefreshValue?: (item: Item) => Promise<Market | null>;
}) {
  useLockBodyScroll();
  const [zoom, setZoom] = useState(false);
  const [market, setMarket] = useState<Market | null>(item.market);
  const [refreshing, setRefreshing] = useState(false);
  const fields = detailFields(item);
  const conditionValue = item.condition ? headlineValue(market, item.condition) : null;
  const showValueRow =
    item.type === "game" && !!item.condition && (conditionValue != null || refreshing);

  // Refresh this game's market value when the detail opens (one at a time).
  useEffect(() => {
    if (item.type !== "game" || !onRefreshValue) return;
    let active = true;
    setRefreshing(true);
    onRefreshValue(item)
      .then((m) => {
        if (active && m) setMarket(m);
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="card modal detail" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
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
              {(item.status === "wishlist" || item.rating) && (
                <p className="detail-badges">
                  {item.status === "wishlist" && (
                    <span className="status status-wishlist">{STATUS_LABELS.wishlist}</span>
                  )}
                  {item.rating ? <span className="rating">{"★".repeat(item.rating)}</span> : null}
                </p>
              )}
            </div>
          </div>

          {(fields.length > 0 || showValueRow) && (
            <dl className="detail-fields">
              {fields.map((f) => (
                <div key={f.label} className="detail-row">
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
              {showValueRow && (
                <div className="detail-row detail-value-row">
                  <dt>Value</dt>
                  <dd>
                    {conditionValue != null ? formatMoney(conditionValue) : "updating…"}
                    {conditionValue != null && market?.updatedAt ? (
                      <span className="muted">
                        {" · updated "}
                        {new Date(market.updatedAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </dd>
                  {market?.url && (
                    <a
                      className="value-link"
                      href={market.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View on PriceCharting"
                    >
                      ↗
                    </a>
                  )}
                </div>
              )}
            </dl>
          )}

          {item.notes && (
            <div className="detail-notes">
              <dt>Notes</dt>
              <dd>{item.notes}</dd>
            </div>
          )}

          <div className="modal-actions detail-actions">
            <button type="button" className="primary" onClick={() => onEdit(item)}>
              Edit
            </button>
            <span className="spacer" />
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
    if (item.condition)
      f.push({ label: "Condition", value: CONDITION_LABELS[item.condition] ?? item.condition });
    if (!item.publisher && !item.platform && item.creator)
      f.push({ label: "Developer", value: item.creator });
  } else {
    if (item.creator)
      f.push({ label: item.type === "book" ? "Author" : "Director", value: item.creator });
    if (item.publisher)
      f.push({ label: item.type === "book" ? "Publisher" : "Label", value: item.publisher });
  }
  if (item.type === "movie" && item.format) f.push({ label: "Format", value: item.format });
  if (item.year) f.push({ label: "Year", value: String(item.year) });
  if (item.type === "book" && item.identifier) f.push({ label: "ISBN", value: item.identifier });
  return f;
}
