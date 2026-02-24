// Run with: npx tsx scripts/fix-last-two.ts
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
  // Champion's Quest, The Die of Destiny — ISBN 9781629728506
  "DetmDbcovsffpttHEhyS": "https://covers.openlibrary.org/b/isbn/9781629728506-M.jpg",
  // The Whalebone Theatre — ISBN 9780593321706
  "WHtrbgJGidI2WQICVTrX": "https://covers.openlibrary.org/b/isbn/9780593321706-M.jpg",
};

async function main() {
  for (const [id, coverUrl] of Object.entries(fixes)) {
    const ref = db.doc(`books/${id}`);
    const snap = await ref.get();
    const title = snap.data()?.title || id;
    await ref.update({ coverUrl });
    console.log(`[OK] ${title} -> ${coverUrl}`);
  }
  console.log("\nAll 91 books now have covers!");
}

main().catch(console.error);
