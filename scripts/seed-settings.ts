// Run with: npx tsx scripts/seed-settings.ts
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

async function seed() {
  // Create settings document
  await db.doc("settings/config").set({
    checkoutDurationDays: 21,
    maxBooksPerMember: 3,
    creditCostCheckout: 1,
    creditRewardDonation: 1,
    nextBookId: 1,
    nextMemberId: 1,
    nextTransactionId: 1,
  });

  console.log("Settings document created!");
}

seed().catch(console.error);
