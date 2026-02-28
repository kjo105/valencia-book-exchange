// Run with: npx tsx scripts/migrate-admins.ts
//
// 1. Reassigns Kara Booker from MID-0001 → MID-0002 (stays admin)
// 2. Creates Mikaela Larson as MID-0001 (admin)
// 3. Updates nextMemberId to 3

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

async function migrateAdmins() {
  // 1. Find Kara Booker's doc and update displayId to MID-0002
  const karaSnap = await db
    .collection("members")
    .where("displayId", "==", "MID-0001")
    .get();

  if (karaSnap.empty) {
    console.error("MID-0001 not found — has this migration already run?");
    process.exit(1);
  }

  const karaDoc = karaSnap.docs[0];
  await karaDoc.ref.update({
    displayId: "MID-0002",
    updatedAt: Timestamp.now(),
  });
  console.log(`Kara Booker reassigned: MID-0001 → MID-0002 (doc ${karaDoc.id})`);

  // 2. Create Mikaela Larson as MID-0001 (admin)
  await db.collection("members").add({
    displayId: "MID-0001",
    lastName: "Larson",
    firstName: "Mikaela",
    phone: "",
    email: "",
    firebaseUid: null,
    role: "admin",
    credits: 0,
    totalDonations: 0,
    booksCheckedOut: 0,
    isActive: true,
    notes: "Admin",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  console.log("Mikaela Larson created as MID-0001 (admin)");

  // 3. Ensure nextMemberId is at least 3
  const settingsRef = db.doc("settings/config");
  const settings = await settingsRef.get();
  const currentNext = settings.data()?.nextMemberId ?? 1;
  if (currentNext < 3) {
    await settingsRef.update({ nextMemberId: 3 });
    console.log(`nextMemberId updated: ${currentNext} → 3`);
  }

  console.log("Migration complete!");
}

migrateAdmins().catch(console.error);
