// Run with: npx tsx scripts/find-missing-covers.ts
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

  for (const book of missing) {
    console.log(`${book.id} | ${book.title} | ${book.authorFirst} ${book.authorLast}`);
  }
  console.log(`\nTotal missing: ${missing.length}`);
}

main().catch(console.error);
