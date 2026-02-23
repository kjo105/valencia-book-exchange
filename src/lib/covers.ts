const SEARCH_API = "https://openlibrary.org/search.json";
const COVER_BASE = "https://covers.openlibrary.org/b/isbn";

export async function fetchOpenLibraryCover(
  title: string,
  author: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      author,
      limit: "1",
      fields: "isbn",
    });

    const res = await fetch(`${SEARCH_API}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const isbn = data.docs?.[0]?.isbn?.[0];
    if (!isbn) return null;

    return `${COVER_BASE}/${isbn}-M.jpg`;
  } catch {
    return null;
  }
}
