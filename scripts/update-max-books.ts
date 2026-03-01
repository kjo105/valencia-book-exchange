// Run with: npx tsx scripts/update-max-books.ts
// Sets maxBooksPerMember to 1 in Firestore
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
  await db.doc("settings/config").update({ maxBooksPerMember: 1 });
  console.log("maxBooksPerMember updated to 1");
}

main().catch(console.error);
