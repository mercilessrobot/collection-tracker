import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { Item, ItemDraft, ItemType } from "../types";
import { TYPE_LABELS, STATUS_LABELS } from "../types";
import { ItemForm } from "./ItemForm";
import { ItemDetail } from "./ItemDetail";

const TYPES: ItemType[] = ["game", "movie", "book"];

type SortKey = "added" | "title-asc" | "title-desc" | "year-desc" | "year-asc" | "rating-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "added", label: "Recently added" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "year-desc", label: "Year (newest)" },
  { value: "year-asc", label: "Year (oldest)" },
  { value: "rating-desc", label: "Rating (high)" },
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
    for (const item of items) c[item.type]++;
    return c;
  }, [items]);

  // Distinct platforms (games) / formats (movies) present, for the filter menu.
  const filterOptions = useMemo(() => {
    if (activeType === "book") return [] as string[];
    const key = activeType === "game" ? "platform" : "format";
    const values = new Set<string>();
    for (const i of items) {
      const v = i[key];
      if (i.type === activeType && v) values.add(v);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [items, activeType]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter((i) => i.type === activeType);

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
  }, [items, activeType, search, filterValue, sort]);

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
        <span className="brand">📚 Collection</span>
        <div className="topbar-right">
          <span className="muted email">{session.user.email}</span>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TYPES.map((t) => (
          <button
            key={t}
            className={t === activeType ? "tab active" : "tab"}
            onClick={() => setActiveType(t)}
          >
            {TYPE_LABELS[t]} <span className="badge">{counts[t]}</span>
          </button>
        ))}
      </nav>

      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder={`Search ${TYPE_LABELS[activeType].toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        {filterOptions.length > 0 && (
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
        <button className="primary" onClick={startAdd}>
          + Add {activeType}
        </button>
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
            Nothing here yet. Tap “+ Add {activeType}” to add your first one.
          </p>
        ) : (
          visible.map((item) => (
            <ItemCard key={item.id} item={item} onOpen={setViewing} />
          ))
        )}
      </main>

      {showForm && (
        <ItemForm
          type={activeType}
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
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
          onDelete={async (it) => {
            if (await handleDelete(it)) setViewing(null);
          }}
        />
      )}
    </div>
  );
}

function ItemCard({ item, onOpen }: { item: Item; onOpen: (i: Item) => void }) {
  const subtitle =
    item.type === "game"
      ? [item.publisher, item.platform].filter(Boolean).join(" · ") || item.creator
      : item.creator;
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
          {item.year && " · "}
          <span className={`status status-${item.status}`}>{STATUS_LABELS[item.status]}</span>
          {item.rating ? <span className="rating"> · {"★".repeat(item.rating)}</span> : null}
          {item.type === "movie" && item.format ? <span> · {item.format}</span> : null}
        </p>
      </div>
    </article>
  );
}
