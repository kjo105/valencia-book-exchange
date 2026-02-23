"use server";

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function createBookAction(data: {
  title: string;
  authorLast: string;
  authorFirst: string;
  author2Last: string | null;
  author2First: string | null;
  genre: string;
  isYA: boolean;
  condition: string;
  status: string;
  donorId: string | null;
  donorName: string | null;
  donationDate: string | null;
  coverUrl: string | null;
  notes: string;
}) {
  // Get next book ID
  const settingsRef = adminDb.doc("settings/config");
  const settings = await settingsRef.get();
  const nextId = settings.data()?.nextBookId || 1;
  const displayId = `BID-${String(nextId).padStart(4, "0")}`;

  await adminDb.collection("books").add({
    ...data,
    displayId,
    timesCheckedOut: 0,
    donationDate: data.donationDate ? Timestamp.fromDate(new Date(data.donationDate)) : Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  await settingsRef.update({ nextBookId: nextId + 1 });

  return { success: true, displayId };
}

export async function updateBookAction(
  docId: string,
  data: {
    title?: string;
    authorLast?: string;
    authorFirst?: string;
    author2Last?: string | null;
    author2First?: string | null;
    genre?: string;
    isYA?: boolean;
    condition?: string;
    status?: string;
    donorId?: string | null;
    donorName?: string | null;
    coverUrl?: string | null;
    notes?: string;
  }
) {
  await adminDb.doc(`books/${docId}`).update({
    ...data,
    updatedAt: Timestamp.now(),
  });

  return { success: true };
}

export async function deleteBookAction(docId: string) {
  await adminDb.doc(`books/${docId}`).delete();
  return { success: true };
}
