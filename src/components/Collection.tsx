import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { Item, ItemDraft, ItemType, Market } from "../types";
import { TYPE_LABELS, TYPE_EMOJI } from "../types";
import { ItemForm } from "./ItemForm";
import { ItemDetail } from "./ItemDetail";
import { headlineValue, formatMoney, fetchGameValue } from "../lib/pricecharting";

const TYPES: ItemType[] = ["game", "movie", "book"];

type SortKey = "added" | "title-asc" | "title-desc" | "year-desc" | "year-asc" | "rating-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "added", label: "Newest" },
  { value: "title-asc", label: "A → Z" },
  { value: "title-desc", label: "Z → A" },
  { value: "year-desc", label: "Year ↓︎" },
  { value: "year-asc", label: "Year ↑︎" },
  { value: "rating-desc", label: "Rating" },
];

export function Collection({ session }: { session: Session }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ItemType>("game");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [sort, setSort] = useState<SortKey>("added");
  const [filterValue, setFilterValue] = useState("");
  const [sectionOpen, setSectionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"collection" | "wishlist">("collection");
  const [showValues, setShowValues] = useState(false);

  // Reset the format/platform filter when switching tabs.
  useEffect(() => {
    setFilterValue("");
  }, [activeType]);

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as Item[]);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const counts = useMemo(() => {
    const c: Record<ItemType, number> = { game: 0, movie: 0, book: 0 };
    for (const item of items) {
      const inView = view === "wishlist" ? item.status === "wishlist" : item.status !== "wishlist";
      if (inView) c[item.type]++;
    }
    return c;
  }, [items, view]);

  // Distinct platforms (games) / formats (movies) present, for the filter menu.
  const filterOptions = useMemo(() => {
    if (activeType === "book") return [] as string[];
    const key = activeType === "game" ? "platform" : "format";
    const values = new Set<string>();
    for (const i of items) {
      const inView = view === "wishlist" ? i.status === "wishlist" : i.status !== "wishlist";
      const v = i[key];
      if (i.type === activeType && inView && v) values.add(v);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [items, activeType, view]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter(
      (i) =>
        i.type === activeType &&
        (view === "wishlist" ? i.status === "wishlist" : i.status !== "wishlist")
    );

    if (q) {
      list = list.filter((i) =>
        [i.title, i.creator, i.publisher, i.platform].some((v) =>
          (v ?? "").toLowerCase().includes(q)
        )
      );
    }

    if (filterValue) {
      list = list.filter((i) =>
        activeType === "game" ? i.platform === filterValue : i.format === filterValue
      );
    }

    const sorted = [...list];
    switch (sort) {
      case "title-asc":
        sorted.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" })
        );
        break;
      case "title-desc":
        sorted.sort((a, b) =>
          b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: "base" })
        );
        break;
      case "year-desc":
        sorted.sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
        break;
      case "year-asc":
        sorted.sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity));
        break;
      case "rating-desc":
        sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        break;
      default:
        break; // "added" keeps the loaded newest-first order
    }
    return sorted;
  }, [items, activeType, search, filterValue, sort, view]);

  async function handleSave(draft: ItemDraft, id?: string): Promise<string | null> {
    if (id) {
      const { error } = await supabase
        .from("items")
        .update({ ...draft, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return error.message;
    } else {
      const { error } = await supabase.from("items").insert(draft);
      if (error) return error.message;
    }
    setShowForm(false);
    setEditing(null);
    await loadItems();
    return null;
  }

  async function handleDelete(item: Item): Promise<boolean> {
    if (!confirm(`Delete "${item.title}"?`)) return false;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) {
      setError(error.message);
      return false;
    }
    await loadItems();
    return true;
  }

  // Refresh one game's market value (called when its detail view opens).
  async function refreshValue(item: Item): Promise<Market | null> {
    if (item.type !== "game") return null;
    try {
      const m = await fetchGameValue(item.title, item.platform);
      const { error } = await supabase
        .from("items")
        .update({ market: m, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (error) return null;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, market: m } : it)));
      return m;
    } catch {
      return null;
    }
  }

  function startAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(item: Item) {
    setEditing(item);
    setShowForm(true);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="menu-anchor">
          <button
            className="section-select"
            onClick={() => setSectionOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={sectionOpen}
          >
            <span className="section-title">
              {TYPE_EMOJI[activeType]} {TYPE_LABELS[activeType].replace(/s$/, "")}{" "}
              {view === "wishlist" ? "Wishlist" : "Collection"}
            </span>
            <span className="chev" aria-hidden="true">
              ▾
            </span>
          </button>
          {sectionOpen && (
            <>
              <div className="popover-backdrop" onClick={() => setSectionOpen(false)} />
              <div className="popover section-menu" role="menu">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    role="menuitem"
                    className={t === activeType ? "popover-item active" : "popover-item"}
                    onClick={() => {
                      setActiveType(t);
                      setSectionOpen(false);
                    }}
                  >
                    <span>
                      {TYPE_EMOJI[t]} {TYPE_LABELS[t]}
                    </span>
                    <span className="badge">{counts[t]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="menu-anchor">
          <button
            className="kebab"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label="Menu"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="popover-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="popover app-menu" role="menu">
                <div className="app-menu-email">{session.user.email}</div>
                <button
                  className="popover-item"
                  role="menuitem"
                  onClick={() => {
                    setView((v) => (v === "wishlist" ? "collection" : "wishlist"));
                    setMenuOpen(false);
                  }}
                >
                  {view === "wishlist" ? "Collection" : "Wishlist"}
                </button>
                <button
                  className="popover-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    supabase.auth.signOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="toolbar controls-row">
        <select
          className="control"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {activeType !== "book" && (
          <select
            className="control"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            aria-label="Filter"
          >
            <option value="">{activeType === "game" ? "All platforms" : "All formats"}</option>
            {filterOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {activeType === "game" && (
          <label className="value-toggle">
            <input
              type="checkbox"
              checked={showValues}
              onChange={(e) => setShowValues(e.target.checked)}
            />
            Values
          </label>
        )}
      </div>

      {error && (
        <p className="error banner" onClick={() => setError(null)}>
          {error} (tap to dismiss)
        </p>
      )}

      <main className="grid">
        {loading ? (
          <p className="muted">Loading your collection…</p>
        ) : visible.length === 0 ? (
          <p className="muted empty">
            {view === "wishlist"
              ? `No ${TYPE_LABELS[activeType].toLowerCase()} on your wishlist yet.`
              : `No ${TYPE_LABELS[activeType].toLowerCase()} yet — tap + to add one.`}
          </p>
        ) : (
          visible.map((item) => (
            <ItemCard key={item.id} item={item} onOpen={setViewing} showValue={showValues} />
          ))
        )}
      </main>

      {!showForm && !viewing && (
        <div className="floating-bar">
          <input
            className="search"
            type="search"
            placeholder={`Search ${TYPE_LABELS[activeType].toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="primary add-btn" onClick={startAdd} aria-label={`Add ${activeType}`}>
            +
          </button>
        </div>
      )}

      {showForm && (
        <ItemForm
          type={activeType}
          initial={editing}
          defaultStatus={view === "wishlist" ? "wishlist" : "owned"}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
          onDelete={
            editing
              ? async () => {
                  const target = editing;
                  if (await handleDelete(target)) {
                    setShowForm(false);
                    setEditing(null);
                  }
                }
              : undefined
          }
        />
      )}

      {viewing && (
        <ItemDetail
          item={viewing}
          onClose={() => setViewing(null)}
          onEdit={(it) => {
            setViewing(null);
            startEdit(it);
          }}
          onRefreshValue={refreshValue}
        />
      )}
    </div>
  );
}

function ItemCard({
  item,
  onOpen,
  showValue,
}: {
  item: Item;
  onOpen: (i: Item) => void;
  showValue: boolean;
}) {
  const subtitle =
    item.type === "game"
      ? [item.publisher, item.platform].filter(Boolean).join(" · ") || item.creator
      : item.creator;
  const value =
    showValue && item.type === "game" && item.condition
      ? formatMoney(headlineValue(item.market, item.condition))
      : null;
  return (
    <article className="item-card clickable" onClick={() => onOpen(item)}>
      <div className="cover">
        {item.cover_url ? (
          <img src={item.cover_url} alt="" loading="lazy" />
        ) : (
          <div className="cover-placeholder">{item.title.slice(0, 1).toUpperCase()}</div>
        )}
      </div>
      <div className="item-body">
        <h3 className="item-title">{item.title}</h3>
        {subtitle && <p className="item-sub">{subtitle}</p>}
        <p className="item-meta">
          {item.year ?? ""}
          {item.rating ? (
            <span className="rating">
              {item.year ? " · " : ""}
              {"★".repeat(item.rating)}
            </span>
          ) : null}
          {item.type === "movie" && item.format ? (
            <span>
              {item.year || item.rating ? " · " : ""}
              {item.format}
            </span>
          ) : null}
        </p>
        {value && <p className="item-value">Value: {value}</p>}
      </div>
    </article>
  );
}
