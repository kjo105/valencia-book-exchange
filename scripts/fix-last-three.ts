// Run with: npx tsx scripts/fix-last-three.ts
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

const fixes: Record<string, string> = {
  // Grimm's Fairy Tales — Puffin Classics
  "ZdpIaT3C8i1KvqmjvXZk": "https://covers.openlibrary.org/b/isbn/9780141331201-M.jpg",
  // Finders Keepers — Stephen King
  "nZV0KVELujHCeIab2eLs": "https://covers.openlibrary.org/b/isbn/9781501100123-M.jpg",
  // Flatland: A Romance of Many Dimensions — Edwin A. Abbott
  "tyOdNJearvKbwig6HN3G": "https://covers.openlibrary.org/b/isbn/048627263X-M.jpg",
};

async function main() {
  for (const [id, coverUrl] of Object.entries(fixes)) {
    const ref = db.doc(`books/${id}`);
    const snap = await ref.get();
    const title = snap.data()?.title || id;
    await ref.update({ coverUrl });
    console.log(`[OK] ${title} -> ${coverUrl}`);
  }
  console.log("\nAll 91 books should now have working covers!");
}

main().catch(console.error);
