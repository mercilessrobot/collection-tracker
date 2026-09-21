import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import type { Item, ItemDraft, ItemType } from "../types";
import { TYPE_LABELS, STATUS_LABELS } from "../types";
import { ItemForm } from "./ItemForm";
import { ItemDetail } from "./ItemDetail";

const TYPES: ItemType[] = ["game", "movie", "book"];

export function Collection({ session }: { session: Session }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ItemType>("game");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Item | null>(null);

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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => i.type === activeType)
      .filter(
        (i) =>
          !q ||
          i.title.toLowerCase().includes(q) ||
          (i.creator ?? "").toLowerCase().includes(q)
      );
  }, [items, activeType, search]);

  async function handleSave(draft: ItemDraft, id?: string) {
    if (id) {
      const { error } = await supabase
        .from("items")
        .update({ ...draft, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return setError(error.message);
    } else {
      const { error } = await supabase.from("items").insert(draft);
      if (error) return setError(error.message);
    }
    setShowForm(false);
    setEditing(null);
    await loadItems();
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
      ? [item.publisher, item.platform].filter(Boolean).join(" · ")
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
