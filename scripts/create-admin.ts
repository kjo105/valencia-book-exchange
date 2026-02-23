// Run with: npx tsx scripts/create-admin.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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

async function createAdmin() {
  // Update settings to increment member ID
  const settingsRef = db.doc("settings/config");
  await settingsRef.update({ nextMemberId: 2 });

  // Create admin member
  await db.collection("members").add({
    displayId: "MID-0001",
    lastName: "Booker",
    firstName: "Kara",
    phone: "",
    email: "booker.kara01@gmail.com",
    firebaseUid: null, // will be linked on first sign-in
    role: "admin",
    credits: 0,
    totalDonations: 0,
    booksCheckedOut: 0,
    isActive: true,
    notes: "Founding admin",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  console.log("Admin member MID-0001 (Booker, Kara) created!");
}

createAdmin().catch(console.error);
