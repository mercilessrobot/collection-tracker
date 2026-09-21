export type ItemType = "game" | "movie" | "book";

// Matches the `status` values allowed by the database check constraint.
export type ItemStatus = "owned" | "wishlist" | "in_progress" | "done";

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  creator: string | null; // author (book) / director (movie)
  publisher: string | null; // game
  platform: string | null; // game
  format: string | null; // movie: DVD / VHS / Blu-Ray / 4K Blu-Ray
  year: number | null;
  status: ItemStatus;
  rating: number | null; // 0-5
  notes: string | null;
  cover_url: string | null;
  identifier: string | null; // ISBN / barcode / external id
  created_at: string;
  updated_at: string;
}

// Fields the user can edit in the form.
export type ItemDraft = Pick<
  Item,
  | "type"
  | "title"
  | "creator"
  | "publisher"
  | "platform"
  | "format"
  | "year"
  | "status"
  | "rating"
  | "notes"
  | "cover_url"
  | "identifier"
>;

export const TYPE_LABELS: Record<ItemType, string> = {
  game: "Games",
  movie: "Movies",
  book: "Books",
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  owned: "Owned",
  wishlist: "Wishlist",
  in_progress: "In progress",
  done: "Finished",
};

// Label for the `creator` field (used by books and movies; games use
// Publisher + Platform instead).
export const CREATOR_LABELS: Record<ItemType, string> = {
  game: "Developer",
  movie: "Director / studio",
  book: "Author",
};

export const MOVIE_FORMATS = ["DVD", "VHS", "Blu-Ray", "4K Blu-Ray"] as const;
