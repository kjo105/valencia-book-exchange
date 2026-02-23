// Run with: npx tsx scripts/import-data.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import { resolve } from "path";
import Papa from "papaparse";
import { readFileSync } from "fs";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

// Map sheet genres to our app genres
const GENRE_MAP: Record<string, string> = {
  "Fiction": "Literary Fiction",
  "Historical Fiction": "Historical Fiction",
  "Science Fiction / Fantasy": "Science Fiction",
  "Biography / Memoir": "Memoir",
  "Self-Help": "Self-Help",
  "Thriller": "Crime / Thriller",
  "Nonfiction": "Non-Fiction",
  "Non-Fiction": "Non-Fiction",
  "Children's": "Children's",
  "Young Adult": "Young Adult",
  "Romance": "Romance",
  "Mystery": "Mystery",
  "Horror": "Horror",
  "Poetry": "Poetry",
  "Humor": "Humor",
  "Philosophy": "Philosophy",
  "Travel": "Travel",
  "Classic": "Classic",
  "Graphic Novel": "Graphic Novel",
  "Adventure": "Adventure",
  "Short Stories": "Short Stories",
};

function mapGenre(raw: string): string {
  if (!raw) return "Other";
  const mapped = GENRE_MAP[raw.trim()];
  return mapped || "Other";
}

function parseAuthor(raw: string): { last: string; first: string } {
  if (!raw) return { last: "", first: "" };
  const parts = raw.split(",").map((s) => s.trim());
  return { last: parts[0] || "", first: parts[1] || "" };
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // Format: M/DD/YYYY or MM/DD/YYYY
  const parts = raw.split("/");
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  return null;
}

async function importBooks() {
  const csv = readFileSync(
    "/Users/karabooker/Documents/Valencia Book Exchange/[Private] Valencia English Book Exchange - The Missing Chapter - Book Inventory.csv",
    "utf-8"
  );

  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = result.data as Record<string, string>[];

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const title = row["Book Title"]?.trim();
    if (!title) {
      skipped++;
      continue;
    }

    const displayId = row["Book ID"]?.trim();
    const author1 = parseAuthor(row["Author (last, first) "] || row["Author (last, first)"] || "");
    const author2 = parseAuthor(row["Author II (last, first)"] || "");
    const genre = mapGenre(row["Genre"] || "");
    const isYA = (row["YA"] || "").toLowerCase() === "yes";
    const condition = row["Condition"]?.trim() || "Good";
    const status = row["Status"]?.trim() || "Available";
    const timesCheckedOut = parseInt(row["Times Checked Out"] || "0") || 0;
    const donorId = row["Donor ID"]?.trim() || null;
    const donorName = row["Donor Name"]?.trim() || null;
    const donationDate = parseDate(row["Donation Date"] || "");

    await db.collection("books").add({
      displayId,
      title,
      authorLast: author1.last,
      authorFirst: author1.first,
      author2Last: author2.last || null,
      author2First: author2.first || null,
      genre,
      isYA,
      condition,
      status,
      timesCheckedOut,
      donorId,
      donorName,
      donationDate: donationDate ? Timestamp.fromDate(donationDate) : null,
      notes: "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    imported++;
  }

  console.log(`Books: ${imported} imported, ${skipped} skipped (empty rows)`);
  return imported;
}

async function importMembers() {
  const csv = readFileSync(
    "/Users/karabooker/Documents/Valencia Book Exchange/[Private] Valencia English Book Exchange - The Missing Chapter - Members.csv",
    "utf-8"
  );

  const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = result.data as Record<string, string>[];

  let imported = 0;
  let skipped = 0;

  // Delete existing members except the admin we already created
  // Actually, let's skip MID-0001 and MID-0002 since those already exist
  const existingSnap = await db.collection("members").get();
  const existingIds = new Set(existingSnap.docs.map((d) => d.data().displayId));

  for (const row of rows) {
    const displayId = row["Member ID"]?.trim();
    const fullName = row["Full Name (Last, First)"]?.trim();

    if (!displayId || !fullName) {
      skipped++;
      continue;
    }

    // Skip if already exists
    if (existingIds.has(displayId)) {
      console.log(`  Skipping ${displayId} (already exists)`);
      // But update donation count
      const existing = existingSnap.docs.find((d) => d.data().displayId === displayId);
      if (existing) {
        const donations = parseInt(row["Donations"] || "0") || 0;
        const booksOut = parseInt(row["Books Currently Checked Out"] || "0") || 0;
        await existing.ref.update({
          totalDonations: donations,
          booksCheckedOut: booksOut,
        });
      }
      continue;
    }

    const nameParts = parseAuthor(fullName);
    const phone = row["Phone Number"]?.trim() || "";
    const donations = parseInt(row["Donations"] || "0") || 0;
    const booksOut = parseInt(row["Books Currently Checked Out"] || "0") || 0;
    const notes = row["Notes"]?.trim() || "";

    await db.collection("members").add({
      displayId,
      lastName: nameParts.last,
      firstName: nameParts.first,
      phone: phone ? `+${phone}` : "",
      email: "",
      firebaseUid: null,
      role: "member",
      credits: 0,
      totalDonations: donations,
      booksCheckedOut: booksOut,
      isActive: true,
      notes,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    imported++;
  }

  console.log(`Members: ${imported} imported, ${skipped} skipped`);
  return imported;
}

async function updateSettings(bookCount: number) {
  await db.doc("settings/config").update({
    nextBookId: bookCount + 1,
    nextMemberId: 5, // 4 real members + 1
    nextTransactionId: 1,
  });
  console.log(`Settings updated: nextBookId=${bookCount + 1}`);
}

async function main() {
  console.log("Starting import...\n");

  const bookCount = await importBooks();
  await importMembers();
  await updateSettings(bookCount);

  console.log("\nImport complete!");
}

main().catch(console.error);
