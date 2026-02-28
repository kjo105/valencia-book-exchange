// Run with: npx tsx scripts/fix-three-placeholders.ts
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
  // Fundamental — Tim James (ISBN 9781643138534)
  "cCdXJYdp7Qgl7CNQwqc2": "https://covers.openlibrary.org/b/isbn/9781643138534-M.jpg",
  // Blue Sisters — Coco Mellors (ISBN 9780593723760)
  "EsFVZ1hqQdcJK74wljzc": "https://covers.openlibrary.org/b/isbn/9780593723760-M.jpg",
  // Gladiator: Street Fighter — Simon Scarrow (ISBN 9780141333649)
  "6gL7LdUuPBsv2itKb2xz": "https://covers.openlibrary.org/b/isbn/9780141333649-M.jpg",
};

async function main() {
  for (const [id, coverUrl] of Object.entries(fixes)) {
    const ref = db.doc(`books/${id}`);
    const snap = await ref.get();
    const title = snap.data()?.title || id;
    await ref.update({ coverUrl });
    console.log(`[OK] ${title} -> ${coverUrl}`);
  }
}

main().catch(console.error);
