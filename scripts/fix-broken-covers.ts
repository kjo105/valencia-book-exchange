// Run with: npx tsx scripts/fix-broken-covers.ts
// Re-fetches covers for books whose current coverUrl doesn't return an actual image
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

// Manual ISBN overrides for books that won't match via API
const MANUAL: Record<string, string> = {
  // Gladiator, Street Fighter — Charlie Connelly
  "6gL7LdUuPBsv2itKb2xz": "9781408846520",
  // Agent 21 Codebreaker — Chris Ryan
  "hTfg3pVRINKRdtbhj1Ey": "9781849410083",
  // Hidden Yellow Stars — Rebecca Connolly
  "k9tmo27MlkPNGfFmpc9B": "9781800901056",
  // Percy Jackson and the Singer of Apollo — Rick Riordan (short story, may not have cover)
  "XyPAhSPZ4e6SPx6pkVmF": "9780141376370",
  // The Children of Willesden Lane — Mona Golabek
  "bsjjonV8XJeAIiJCWRQD": "9780446690270",
  // I Can Fix This — Robin Barnett
  "Si7dY9LMPCNmyayydTiF": "9780063286757",
  // Fundamental — Tim James
  "cCdXJYdp7Qgl7CNQwqc2": "9781643135717",
  // The Turk — Tom Standage
  "dEP7Tz4v2W0K996IjiDo": "9780802713919",
  // National Geographic Science of Everything
  "zO0PhQztvz6jrN8WCmXy": "9781426211683",
  // Entitlement — Rumaan Alam
  "eLhOF824z9ymKrQS9rtB": "9780593536827",
  // James — Percival Everett
  "v5AUrEmx6r5Tc8O1KaPN": "9780385550369",
  // Blue Sisters — Coco Mellors
  "EsFVZ1hqQdcJK74wljzc": "9780593656440",
  // Play Winning Chess — Yasser Seirawan
  "oyzwWN5MdcyODeFzXmtQ": "9781857443264",
  // Nowhere Boy — Katherine Marsh
  "MBDowQ8FJ7LZIAayuAlQ": "9781250307576",
  // The Parade — Dave Eggers
  "KmFxgbKMDmUdWHSwbrhj": "9780525655411",
  // We Die Alone — David Howarth
  "kIVfnYYwjaSqWnmOA3mK": "9781599210735",
};

// Broken book IDs from audit
const BROKEN_IDS = [
  "59QfJcxawpIH27Hx9r1E", "6gL7LdUuPBsv2itKb2xz", "CPLQmH3k40YdJTR5lQzx",
  "DvKVl1NcBSRUK78rPFpa", "EQChEWHWyHFm8sndzpP1", "EsFVZ1hqQdcJK74wljzc",
  "FvtcPxYxrwc6bIDf3TCr", "HgwSyGcIB0PI6bTKuE67", "J6gk6CU1iuHHJ8xAnHv9",
  "KA4O77e63wePKxU3skDl", "KmFxgbKMDmUdWHSwbrhj", "MBDowQ8FJ7LZIAayuAlQ",
  "PMhIoS44hYxpw3PNcTAm", "QvDE3UV8X7ucGRqZSrMK", "Si7dY9LMPCNmyayydTiF",
  "V4zzoeg3b4MlLtqJ9AR0", "WjB3sfrJJ5oaAwPqMmjF", "XyPAhSPZ4e6SPx6pkVmF",
  "ZdpIaT3C8i1KvqmjvXZk", "bsjjonV8XJeAIiJCWRQD", "cCdXJYdp7Qgl7CNQwqc2",
  "dEP7Tz4v2W0K996IjiDo", "dq6hV7tAyJ3ni3qgGXzV", "eLhOF824z9ymKrQS9rtB",
  "hTfg3pVRINKRdtbhj1Ey", "k9tmo27MlkPNGfFmpc9B", "kIVfnYYwjaSqWnmOA3mK",
  "nZV0KVELujHCeIab2eLs", "oyzwWN5MdcyODeFzXmtQ", "qrM0avGXs7MmMTiwOTjj",
  "raG3BuRMa9ocmvJeGFTK", "s3L3DCYJIbRXXl4lhIbX", "tyOdNJearvKbwig6HN3G",
  "v5AUrEmx6r5Tc8O1KaPN", "yRUnRdkIZ2wEcclOK1JX", "zO0PhQztvz6jrN8WCmXy",
];

function titleVariants(title: string): string[] {
  const variants: string[] = [title];
  const noParens = title.replace(/\s*\(.*?\)\s*/g, "").trim();
  if (noParens !== title) variants.push(noParens);
  const noSubtitle = title.split(":")[0].trim();
  if (noSubtitle !== title) variants.push(noSubtitle);
  const noDash = title.split(" - ")[0].trim();
  if (noDash !== title) variants.push(noDash);
  return [...new Set(variants)];
}

async function searchISBN(title: string, author: string): Promise<string | null> {
  const params = new URLSearchParams({ title, author, limit: "3", fields: "isbn" });
  const res = await fetch(`${SEARCH_API}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();

  // Try each result's ISBNs until we find one with a real cover
  for (const doc of data.docs || []) {
    for (const isbn of (doc.isbn || []).slice(0, 3)) {
      const url = `${COVER_BASE}/${isbn}-M.jpg`;
      try {
        const check = await fetch(url, { method: "HEAD", redirect: "follow" });
        const ct = check.headers.get("content-type") || "";
        const cl = parseInt(check.headers.get("content-length") || "0", 10);
        if (check.ok && ct.startsWith("image/") && (cl === 0 || cl > 1000)) {
          return isbn;
        }
      } catch {}
      await sleep(50);
    }
  }
  return null;
}

async function main() {
  let fixed = 0;
  let stillBroken = 0;

  for (const id of BROKEN_IDS) {
    const ref = db.doc(`books/${id}`);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const d = snap.data()!;
    const title = d.title || "(untitled)";
    const author = [d.authorFirst, d.authorLast].filter(Boolean).join(" ");

    // Check manual override first
    if (MANUAL[id]) {
      const url = `${COVER_BASE}/${MANUAL[id]}-M.jpg`;
      await ref.update({ coverUrl: url });
      fixed++;
      console.log(`[MANUAL]  ${title} -> ${url}`);
      continue;
    }

    // Try API search with title variants
    let foundIsbn: string | null = null;
    for (const variant of titleVariants(title)) {
      foundIsbn = await searchISBN(variant, author);
      if (foundIsbn) break;
      await sleep(150);

      // Also try without author
      foundIsbn = await searchISBN(variant, "");
      if (foundIsbn) break;
      await sleep(150);
    }

    if (foundIsbn) {
      const url = `${COVER_BASE}/${foundIsbn}-M.jpg`;
      await ref.update({ coverUrl: url });
      fixed++;
      console.log(`[FIXED]   ${title} -> ${url}`);
    } else {
      stillBroken++;
      console.log(`[MISS]    ${title}`);
    }

    await sleep(100);
  }

  console.log(`\n========== DONE ==========`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Still missing: ${stillBroken}`);
}

main().catch(console.error);
