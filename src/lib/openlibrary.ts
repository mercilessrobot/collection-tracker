// Keyless book lookup via the Open Library API (no API key required).
// https://openlibrary.org/dev/docs/api/books

export interface BookLookupResult {
  title: string;
  creator: string | null; // author(s)
  year: number | null;
  cover_url: string | null;
}

export async function lookupIsbn(rawIsbn: string): Promise<BookLookupResult> {
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, "");
  if (isbn.length !== 10 && isbn.length !== 13) {
    throw new Error("That doesn't look like a 10- or 13-digit ISBN.");
  }

  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open Library request failed (${res.status}).`);
  }

  const data = (await res.json()) as Record<string, OpenLibraryBook>;
  const book = data[`ISBN:${isbn}`];
  if (!book) {
    throw new Error("No book found for that ISBN.");
  }

  const year = book.publish_date ? parseYear(book.publish_date) : null;
  const authors = book.authors?.map((a) => a.name).filter(Boolean) ?? [];

  return {
    title: book.title ?? "",
    creator: authors.length ? authors.join(", ") : null,
    year,
    cover_url: book.cover?.medium ?? book.cover?.large ?? book.cover?.small ?? null,
  };
}

function parseYear(publishDate: string): number | null {
  const match = publishDate.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

interface OpenLibraryBook {
  title?: string;
  publish_date?: string;
  authors?: { name: string }[];
  cover?: { small?: string; medium?: string; large?: string };
}
