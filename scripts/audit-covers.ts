// Run with: npx tsx scripts/audit-covers.ts
// Checks every book's coverUrl to see if the image actually loads (HTTP 200 + real image)
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const snapshot = await db.collection("books").get();
  console.log(`Checking ${snapshot.size} books...\n`);

  const broken: { id: string; title: string; coverUrl: string; reason: string }[] = [];
  const missing: { id: string; title: string }[] = [];

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const title = d.title || "(untitled)";

    if (!d.coverUrl) {
      missing.push({ id: doc.id, title });
      console.log(`[NO URL]  ${title}`);
      continue;
    }

    try {
      const res = await fetch(d.coverUrl, { method: "HEAD", redirect: "follow" });
      const contentType = res.headers.get("content-type") || "";
      const contentLength = parseInt(res.headers.get("content-length") || "0", 10);

      if (!res.ok) {
        broken.push({ id: doc.id, title, coverUrl: d.coverUrl, reason: `HTTP ${res.status}` });
        console.log(`[${res.status}]     ${title}`);
      } else if (!contentType.startsWith("image/")) {
        broken.push({ id: doc.id, title, coverUrl: d.coverUrl, reason: `Not an image: ${contentType}` });
        console.log(`[BAD TYPE] ${title} — ${contentType}`);
      } else if (contentLength > 0 && contentLength < 1000) {
        // Open Library returns a tiny 1x1 placeholder for missing covers
        broken.push({ id: doc.id, title, coverUrl: d.coverUrl, reason: `Placeholder (${contentLength} bytes)` });
        console.log(`[TINY]    ${title} — ${contentLength} bytes`);
      } else {
        console.log(`[OK]      ${title}`);
      }
    } catch (err: any) {
      broken.push({ id: doc.id, title, coverUrl: d.coverUrl, reason: err.message });
      console.log(`[ERROR]   ${title} — ${err.message}`);
    }

    await sleep(50);
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Total books: ${snapshot.size}`);
  console.log(`OK: ${snapshot.size - broken.length - missing.length}`);
  console.log(`Broken/placeholder: ${broken.length}`);
  console.log(`No URL at all: ${missing.length}`);

  if (broken.length > 0) {
    console.log(`\n--- Broken covers ---`);
    for (const b of broken) {
      console.log(`  ${b.id}  ${b.title}  (${b.reason})`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n--- Missing URLs ---`);
    for (const m of missing) {
      console.log(`  ${m.id}  ${m.title}`);
    }
  }
}

main().catch(console.error);
