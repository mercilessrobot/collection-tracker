export type ItemType = "game" | "movie" | "book";

// Matches the `status` values allowed by the database check constraint.
export type ItemStatus = "owned" | "wishlist" | "in_progress" | "done";

export interface Market {
  loose: number | null; // cents
  cib: number | null;
  new: number | null;
  url: string | null;
  matchedTitle?: string | null;
  matchedConsole?: string | null;
  updatedAt: string;
}

export interface Item {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  creator: string | null; // author (book) / director (movie)
  publisher: string | null; // game
  platform: string | null; // game
  condition: string | null; // game: loose / cib / new (which copy you own)
  format: string | null; // movie: DVD / VHS / Blu-Ray / 4K Blu-Ray
  year: number | null;
  status: ItemStatus;
  rating: number | null; // 0-5
  notes: string | null;
  cover_url: string | null;
  identifier: string | null; // ISBN / barcode / external id
  market: Market | null; // game market value (PriceCharting), in cents
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
  | "condition"
  | "format"
  | "year"
  | "status"
  | "rating"
  | "notes"
  | "cover_url"
  | "identifier"
  | "market"
>;

export const TYPE_LABELS: Record<ItemType, string> = {
  game: "Games",
  movie: "Movies",
  book: "Books",
};

export const TYPE_EMOJI: Record<ItemType, string> = {
  game: "🎮",
  movie: "🎬",
  book: "📚",
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
  movie: "Director",
  book: "Author",
};

export const MOVIE_FORMATS = ["DVD", "VHS", "Blu-Ray", "4K Blu-Ray"] as const;

// Game condition — which copy you own; drives which PriceCharting price shows.
export const GAME_CONDITIONS: { value: string; label: string }[] = [
  { value: "loose", label: "Loose" },
  { value: "cib", label: "CIB" },
  { value: "new", label: "New (sealed)" },
];
export const CONDITION_LABELS: Record<string, string> = {
  loose: "Loose",
  cib: "CIB",
  new: "New (sealed)",
};

// Major gaming platforms, grouped by maker for the game Platform picker.
export const PLATFORM_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "Nintendo",
    options: [
      "NES",
      "SNES",
      "Nintendo 64",
      "GameCube",
      "Wii",
      "Wii U",
      "Switch",
      "Game Boy",
      "Game Boy Color",
      "Game Boy Advance",
      "Nintendo DS",
      "Nintendo 3DS",
    ],
  },
  {
    label: "Sega",
    options: [
      "Sega Master System",
      "Sega Genesis",
      "Sega CD",
      "Sega 32X",
      "Sega Saturn",
      "Sega Dreamcast",
      "Sega Game Gear",
    ],
  },
  {
    label: "Sony",
    options: [
      "PlayStation",
      "PlayStation 2",
      "PlayStation 3",
      "PlayStation 4",
      "PlayStation 5",
      "PSP",
      "PS Vita",
    ],
  },
  {
    label: "Microsoft",
    options: ["Xbox", "Xbox 360", "Xbox One", "Xbox Series X/S"],
  },
  {
    label: "Atari",
    options: ["Atari 2600", "Atari 5200", "Atari 7800", "Atari Jaguar", "Atari Lynx"],
  },
  {
    label: "Other",
    options: [
      "PC",
      "Mac",
      "Arcade",
      "Neo Geo",
      "TurboGrafx-16",
      "3DO",
      "Intellivision",
      "ColecoVision",
      "Commodore 64",
      "Amiga",
      "Mobile",
    ],
  },
];

export const PLATFORMS: string[] = PLATFORM_GROUPS.flatMap((g) => g.options);
