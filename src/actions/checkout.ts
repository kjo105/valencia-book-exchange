"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function checkoutBookAction(data: {
  bookDocId: string;
  bookDisplayId: string;
  bookTitle: string;
  borrowerDocId: string;
  borrowerDisplayId: string;
  borrowerName: string;
  conditionAtCheckout: string;
}) {
  // Verify book is available
  const bookRef = adminDb.doc(`books/${data.bookDocId}`);
  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) {
    return { success: false, error: "Book not found" };
  }
  const book = bookSnap.data()!;
  if (book.status !== "Available") {
    return { success: false, error: "Book is not available for checkout" };
  }

  // Check member limits
  const settingsSnap = await adminDb.doc("settings/config").get();
  const settings = settingsSnap.data() || {};
  const maxBooks = settings.maxBooksPerMember || 3;

  const memberRef = adminDb.doc(`members/${data.borrowerDocId}`);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    return { success: false, error: "Member not found" };
  }
  const member = memberSnap.data()!;
  if (member.booksCheckedOut >= maxBooks) {
    return {
      success: false,
      error: `Member has reached the maximum of ${maxBooks} checked out books`,
    };
  }

  // Get next transaction ID
  const settingsRef = adminDb.doc("settings/config");
  const nextTxnId = settings.nextTransactionId || 1;
  const displayId = `TID-${String(nextTxnId).padStart(4, "0")}`;

  const checkoutDays = settings.checkoutDurationDays || 21;
  const checkoutDate = new Date();
  const dueDate = new Date(checkoutDate);
  dueDate.setDate(dueDate.getDate() + checkoutDays);

  // Create transaction
  await adminDb.collection("transactions").add({
    displayId,
    bookId: data.bookDisplayId,
    bookTitle: data.bookTitle,
    borrowerId: data.borrowerDisplayId,
    borrowerName: data.borrowerName,
    checkoutDate: Timestamp.fromDate(checkoutDate),
    dueDate: Timestamp.fromDate(dueDate),
    checkinDate: null,
    isCheckedOut: true,
    durationDays: null,
    conditionAtCheckout: data.conditionAtCheckout,
    conditionAtCheckin: null,
    notes: "",
    createdAt: Timestamp.now(),
  });

  // Update book status
  await bookRef.update({
    status: "Checked Out",
    timesCheckedOut: (book.timesCheckedOut || 0) + 1,
    updatedAt: Timestamp.now(),
  });

  // Update member counts
  await memberRef.update({
    booksCheckedOut: (member.booksCheckedOut || 0) + 1,
    updatedAt: Timestamp.now(),
  });

  // Update settings counter
  await settingsRef.update({ nextTransactionId: nextTxnId + 1 });

  return { success: true, displayId };
}

export async function checkinBookAction(data: {
  transactionDocId: string;
  bookDocId: string;
  borrowerDocId: string;
  conditionAtCheckin: string;
  notes: string;
}) {
  const txnRef = adminDb.doc(`transactions/${data.transactionDocId}`);
  const txnSnap = await txnRef.get();
  if (!txnSnap.exists) {
    return { success: false, error: "Transaction not found" };
  }
  const txn = txnSnap.data()!;

  const checkinDate = new Date();
  const checkoutDate = txn.checkoutDate.toDate();
  const durationDays = Math.round(
    (checkinDate.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Update transaction
  await txnRef.update({
    checkinDate: Timestamp.fromDate(checkinDate),
    isCheckedOut: false,
    durationDays,
    conditionAtCheckin: data.conditionAtCheckin,
    notes: data.notes,
  });

  // Update book status and condition
  const bookRef = adminDb.doc(`books/${data.bookDocId}`);
  await bookRef.update({
    status: "Available",
    condition: data.conditionAtCheckin,
    updatedAt: Timestamp.now(),
  });

  // Update member count
  const memberRef = adminDb.doc(`members/${data.borrowerDocId}`);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    const member = memberSnap.data()!;
    await memberRef.update({
      booksCheckedOut: Math.max(0, (member.booksCheckedOut || 1) - 1),
      updatedAt: Timestamp.now(),
    });
  }

  return { success: true };
}
