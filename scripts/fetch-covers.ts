// Run with: npx tsx scripts/fetch-covers.ts
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCoverUrl(
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

async function main() {
  const snapshot = await db.collection("books").get();
  const books = snapshot.docs;

  console.log(`Found ${books.length} books. Fetching covers...\n`);

  let found = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const doc of books) {
    const data = doc.data();

    // Skip books that already have a cover
    if (data.coverUrl) {
      skipped++;
      console.log(`[SKIP] ${data.title} — already has cover`);
      continue;
    }

    const author = [data.authorFirst, data.authorLast]
      .filter(Boolean)
      .join(" ");

    try {
      const coverUrl = await fetchCoverUrl(data.title, author);

      if (coverUrl) {
        await doc.ref.update({ coverUrl });
        found++;
        console.log(`[OK]   ${data.title} — ${coverUrl}`);
      } else {
        notFound++;
        console.log(`[MISS] ${data.title} — no cover found`);
      }
    } catch (err) {
      errors++;
      console.error(`[ERR]  ${data.title} —`, err);
    }

    // Rate limit: 100ms between requests
    await sleep(100);
  }

  console.log(
    `\nDone! Found: ${found}, Skipped: ${skipped}, Not found: ${notFound}, Errors: ${errors}`
  );
}

main().catch(console.error);
