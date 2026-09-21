// Shared shape for a metadata search result, across all providers
// (Open Library, TMDB, RAWG). Maps directly onto the item form fields.
export interface LookupResult {
  title: string;
  creator: string | null; // author / director
  year: number | null;
  cover_url: string | null;
  sourceId: string; // provider's own id, used to fetch extra details on pick
  publisher?: string | null; // game
  platform?: string | null; // game
}
