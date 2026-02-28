const SEARCH_API = "https://openlibrary.org/search.json";
const COVER_BASE = "https://covers.openlibrary.org/b/isbn";

/**
 * Checks whether an Open Library cover URL returns a real image
 * (not a 1x1 pixel placeholder GIF which is 43 bytes).
 */
async function isRealCover(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return false;
    const blob = await res.blob();
    // Open Library returns a 43-byte 1x1 GIF for missing covers
    return blob.size > 1000;
  } catch {
    return false;
  }
}

export async function fetchOpenLibraryCover(
  title: string,
  author: string
): Promise<string | null> {
  try {
    // Search with title + author, grab multiple results to try more ISBNs
    const params = new URLSearchParams({
      title,
      author,
      limit: "3",
      fields: "isbn",
    });

    const res = await fetch(`${SEARCH_API}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();

    // Try ISBNs from each result until we find one with a real cover
    for (const doc of data.docs || []) {
      for (const isbn of (doc.isbn || []).slice(0, 5)) {
        const url = `${COVER_BASE}/${isbn}-M.jpg`;
        if (await isRealCover(url)) {
          return url;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
