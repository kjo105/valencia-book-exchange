// Run with: npx tsx scripts/fix-12-rules-cover.ts
// Fixes wrong cover on "12 Rules for Life" (was showing "Lifespan")
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
  // Find the book by title
  const snap = await db
    .collection("books")
    .where("title", "==", "12 Rules for Life: An Antidote to Chaos")
    .get();

  if (snap.empty) {
    console.log("Book not found, trying partial match...");
    const allBooks = await db.collection("books").get();
    for (const doc of allBooks.docs) {
      if (doc.data().title?.includes("12 Rules")) {
        console.log(`Found: ${doc.id} — ${doc.data().title}`);
        console.log(`Current coverUrl: ${doc.data().coverUrl}`);
      }
    }
    return;
  }

  const doc = snap.docs[0];
  console.log(`Found: ${doc.id} — ${doc.data().title}`);
  console.log(`Old coverUrl: ${doc.data().coverUrl}`);

  // Correct ISBN for "12 Rules for Life" by Jordan B. Peterson
  const correctUrl = "https://covers.openlibrary.org/b/isbn/9780345816023-M.jpg";
  await doc.ref.update({ coverUrl: correctUrl });
  console.log(`New coverUrl: ${correctUrl}`);
  console.log("Done!");
}

main().catch(console.error);
