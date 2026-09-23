// Keyless book lookup via the Open Library Search API (no API key required,
// CORS-enabled). We use search.json because the older /api/books endpoint now
// returns 404. https://openlibrary.org/dev/docs/api/search

export interface BookLookupResult {
  title: string;
  creator: string | null; // author(s)
  publisher: string | null;
  year: number | null;
  cover_url: string | null;
}

export async function lookupIsbn(rawIsbn: string): Promise<BookLookupResult> {
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, "");
  if (isbn.length !== 10 && isbn.length !== 13) {
    throw new Error("That doesn't look like a 10- or 13-digit ISBN.");
  }

  const url = `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,author_name,publisher,first_publish_year,cover_i&limit=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open Library request failed (${res.status}).`);
  }

  const data = (await res.json()) as OpenLibrarySearch;
  const doc = data.docs?.[0];
  if (!doc) {
    throw new Error("No book found for that ISBN.");
  }

  const authors = [...new Set(doc.author_name ?? [])];
  return {
    title: doc.title ?? "",
    creator: authors.length ? authors.join(", ") : null,
    publisher: doc.publisher?.[0] ?? null,
    year: doc.first_publish_year ?? null,
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
  };
}

interface OpenLibrarySearch {
  docs?: {
    title?: string;
    author_name?: string[];
    publisher?: string[];
    first_publish_year?: number;
    cover_i?: number;
  }[];
}
