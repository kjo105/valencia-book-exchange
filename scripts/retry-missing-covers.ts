// Run with: npx tsx scripts/retry-missing-covers.ts
// Retries missing covers with cleaned-up titles and multiple search strategies
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

const SEARCH_API = "https://openlibrary.org/search.json";
const COVER_BASE = "https://covers.openlibrary.org/b/isbn";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Generate multiple search-friendly title variants
function titleVariants(title: string): string[] {
  const variants: string[] = [title];

  // Remove parenthetical series info: "Title (Book 1)" -> "Title"
  const noParens = title.replace(/\s*\(.*?\)\s*/g, "").trim();
  if (noParens !== title) variants.push(noParens);

  // Remove subtitle after colon: "Title: Subtitle" -> "Title"
  const noSubtitle = title.split(":")[0].trim();
  if (noSubtitle !== title) variants.push(noSubtitle);

  // Remove subtitle after dash: "Title - Subtitle" -> "Title"
  const noDash = title.split(" - ")[0].trim();
  if (noDash !== title) variants.push(noDash);

  // Combine: remove both parens and subtitle
  const cleaned = noParens.split(":")[0].split(" - ")[0].trim();
  if (cleaned !== title && cleaned !== noParens && cleaned !== noSubtitle) {
    variants.push(cleaned);
  }

  return [...new Set(variants)];
}

async function searchCover(
  title: string,
  author: string
): Promise<string | null> {
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
}

// Manual overrides for books that won't match via API (typos, obscure editions, etc.)
const MANUAL_OVERRIDES: Record<string, string> = {
  // The Great Gatsby - author is misspelled "Fitzergeral" in DB
  "OryKqPzuKp2CKkGNGDI8": "https://covers.openlibrary.org/b/isbn/9780743273565-M.jpg",
  // Harry Potter and the Sorcerer's Stone
  "gjm3ZFHHK53CHMSYHMW8": "https://covers.openlibrary.org/b/isbn/0590353403-M.jpg",
  // Harry Potter and the Prisoner of Azkaban
  "ipjWXGI1z3NliNrxcIBp": "https://covers.openlibrary.org/b/isbn/0439136369-M.jpg",
  // The Lord of the Rings: The Fellowship of the Ring (copy 1)
  "FXawIYbZlsdYzzsIioz0": "https://covers.openlibrary.org/b/isbn/0618346252-M.jpg",
  // The Lord of the Rings: The Fellowship of the Ring (copy 2)
  "khpKo0tr0QaSfx9wIKEP": "https://covers.openlibrary.org/b/isbn/0618346252-M.jpg",
  // Grimm's Fairy Tales
  "ZdpIaT3C8i1KvqmjvXZk": "https://covers.openlibrary.org/b/isbn/9781435166875-M.jpg",
  // Darkness at Noon
  "JS0YQfEvtBo2AvIFHdPw": "https://covers.openlibrary.org/b/isbn/9781784873189-M.jpg",
};

async function main() {
  const snapshot = await db.collection("books").get();
  const missing: { id: string; title: string; authorFirst: string; authorLast: string }[] = [];

  for (const doc of snapshot.docs) {
    const d = doc.data();
    if (!d.coverUrl) {
      missing.push({
        id: doc.id,
        title: d.title,
        authorFirst: d.authorFirst || "",
        authorLast: d.authorLast || "",
      });
    }
  }

  console.log(`Retrying ${missing.length} books with smarter search...\n`);

  let found = 0;
  let manual = 0;
  let notFound = 0;

  for (const book of missing) {
    // Check manual overrides first
    if (MANUAL_OVERRIDES[book.id]) {
      await db.doc(`books/${book.id}`).update({ coverUrl: MANUAL_OVERRIDES[book.id] });
      manual++;
      console.log(`[MANUAL] ${book.title}`);
      continue;
    }

    const author = [book.authorFirst, book.authorLast].filter(Boolean).join(" ");
    const variants = titleVariants(book.title);
    let coverUrl: string | null = null;

    // Try each title variant
    for (const variant of variants) {
      coverUrl = await searchCover(variant, author);
      if (coverUrl) break;
      await sleep(100);
    }

    // Try title-only search (no author) as last resort
    if (!coverUrl) {
      for (const variant of variants) {
        const params = new URLSearchParams({ title: variant, limit: "1", fields: "isbn" });
        const res = await fetch(`${SEARCH_API}?${params}`);
        if (res.ok) {
          const data = await res.json();
          const isbn = data.docs?.[0]?.isbn?.[0];
          if (isbn) {
            coverUrl = `${COVER_BASE}/${isbn}-M.jpg`;
            break;
          }
        }
        await sleep(100);
      }
    }

    if (coverUrl) {
      await db.doc(`books/${book.id}`).update({ coverUrl });
      found++;
      console.log(`[OK]     ${book.title} -> ${coverUrl}`);
    } else {
      notFound++;
      console.log(`[MISS]   ${book.title}`);
    }

    await sleep(100);
  }

  console.log(`\nDone! API found: ${found}, Manual: ${manual}, Still missing: ${notFound}`);
}

main().catch(console.error);
