"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const HOLD_DURATION_HOURS = 24;

/** Lazily expire a hold if it's active and past its expiration time.
 *  Accepts expiresAtMs (milliseconds) so it can be called from client components. */
export async function expireHoldIfNeeded(holdDoc: {
  id: string;
  status: string;
  expiresAtMs: number;
  bookDocId: string;
}) {
  if (holdDoc.status !== "active") return false;
  if (holdDoc.expiresAtMs >= Date.now()) return false;

  // Hold has expired — update hold and book
  await adminDb.doc(`holds/${holdDoc.id}`).update({ status: "expired" });
  await adminDb.doc(`books/${holdDoc.bookDocId}`).update({
    status: "Available",
    updatedAt: Timestamp.now(),
  });
  return true;
}

export async function placeHoldAction(data: {
  bookDocId: string;
  bookDisplayId: string;
  bookTitle: string;
  holderDocId: string;
  holderDisplayId: string;
  holderName: string;
}) {
  // Verify book is available
  const bookRef = adminDb.doc(`books/${data.bookDocId}`);
  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) {
    return { success: false, error: "Book not found" };
  }
  const book = bookSnap.data()!;
  if (book.status !== "Available") {
    return { success: false, error: "Book is not available for hold" };
  }

  // Verify member doesn't already have an active hold
  const existingHolds = await adminDb
    .collection("holds")
    .where("holderId", "==", data.holderDisplayId)
    .where("status", "==", "active")
    .get();

  // Check each existing hold for expiration before rejecting
  for (const doc of existingHolds.docs) {
    const holdData = doc.data();
    const expired = await expireHoldIfNeeded({
      id: doc.id,
      status: holdData.status,
      expiresAtMs: holdData.expiresAt.toMillis(),
      bookDocId: holdData.bookDocId,
    });
    if (!expired) {
      return {
        success: false,
        error: "Member already has an active hold. Cancel it first.",
      };
    }
  }

  // Set book status to "On Hold"
  await bookRef.update({
    status: "On Hold",
    updatedAt: Timestamp.now(),
  });

  // Create hold document
  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_DURATION_HOURS * 60 * 60 * 1000);

  const holdRef = await adminDb.collection("holds").add({
    bookId: data.bookDisplayId,
    bookTitle: data.bookTitle,
    bookDocId: data.bookDocId,
    holderId: data.holderDisplayId,
    holderName: data.holderName,
    holderDocId: data.holderDocId,
    holdDate: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: "active",
    createdAt: Timestamp.now(),
  });

  return { success: true, holdId: holdRef.id };
}

export async function cancelHoldAction(data: {
  holdDocId: string;
  bookDocId: string;
}) {
  const holdRef = adminDb.doc(`holds/${data.holdDocId}`);
  const holdSnap = await holdRef.get();
  if (!holdSnap.exists) {
    return { success: false, error: "Hold not found" };
  }

  await holdRef.update({ status: "cancelled" });
  await adminDb.doc(`books/${data.bookDocId}`).update({
    status: "Available",
    updatedAt: Timestamp.now(),
  });

  return { success: true };
}

export async function fulfillHoldAction(data: { holdDocId: string }) {
  const holdRef = adminDb.doc(`holds/${data.holdDocId}`);
  const holdSnap = await holdRef.get();
  if (!holdSnap.exists) {
    return { success: false, error: "Hold not found" };
  }
  const hold = holdSnap.data()!;

  // Check if hold is still active
  if (hold.status !== "active") {
    return { success: false, error: "Hold is no longer active" };
  }

  // Check for expiration
  const expired = await expireHoldIfNeeded({
    id: data.holdDocId,
    status: hold.status,
    expiresAtMs: hold.expiresAt.toMillis(),
    bookDocId: hold.bookDocId,
  });
  if (expired) {
    return { success: false, error: "Hold has expired" };
  }

  // Mark hold as fulfilled and set book back to Available
  // (the subsequent checkoutBookAction will set it to "Checked Out")
  await holdRef.update({ status: "fulfilled" });
  await adminDb.doc(`books/${hold.bookDocId}`).update({
    status: "Available",
    updatedAt: Timestamp.now(),
  });

  return {
    success: true,
    bookDocId: hold.bookDocId,
    bookDisplayId: hold.bookId,
    bookTitle: hold.bookTitle,
    holderDocId: hold.holderDocId,
    holderDisplayId: hold.holderId,
    holderName: hold.holderName,
  };
}
