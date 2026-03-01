"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { checkoutBookAction } from "./checkout";
import { createNotificationAction } from "./notifications";
import type { PickupWindow } from "@/lib/validators";

export async function requestCheckoutAction(data: {
  bookDocId: string;
  bookDisplayId: string;
  bookTitle: string;
  requesterDocId: string;
  requesterDisplayId: string;
  requesterName: string;
}) {
  // Verify book is available
  const bookRef = adminDb.doc(`books/${data.bookDocId}`);
  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) {
    return { success: false, error: "Book not found" };
  }
  const book = bookSnap.data()!;
  if (book.status !== "Available" && book.status !== "On Hold") {
    return { success: false, error: "Book is not available for checkout" };
  }

  // If book is on hold, only the hold owner can request
  if (book.status === "On Hold") {
    const activeHolds = await adminDb
      .collection("holds")
      .where("bookDocId", "==", data.bookDocId)
      .where("status", "==", "active")
      .get();
    const holdDoc = activeHolds.docs[0];
    if (holdDoc && holdDoc.data().holderId !== data.requesterDisplayId) {
      return { success: false, error: "This book is on hold for another member" };
    }
  }

  // Check member limits
  const settingsSnap = await adminDb.doc("settings/config").get();
  const settings = settingsSnap.data() || {};
  const maxBooks = settings.maxBooksPerMember || 1;

  const memberRef = adminDb.doc(`members/${data.requesterDocId}`);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    return { success: false, error: "Member not found" };
  }
  const member = memberSnap.data()!;
  if (member.booksCheckedOut >= maxBooks) {
    return {
      success: false,
      error: `You have reached the maximum of ${maxBooks} checked out book(s)`,
    };
  }

  // Check for existing pending request for this book by this member
  const existingRequests = await adminDb
    .collection("checkoutRequests")
    .where("bookDocId", "==", data.bookDocId)
    .where("requesterDocId", "==", data.requesterDocId)
    .where("status", "in", ["pending", "approved", "scheduled"])
    .get();
  if (!existingRequests.empty) {
    return { success: false, error: "You already have a pending request for this book" };
  }

  // Set book to "Pending Pickup"
  await bookRef.update({
    status: "Pending Pickup",
    updatedAt: Timestamp.now(),
  });

  // If book was on hold, fulfill the hold
  if (book.status === "On Hold") {
    const activeHolds = await adminDb
      .collection("holds")
      .where("bookDocId", "==", data.bookDocId)
      .where("status", "==", "active")
      .get();
    for (const holdDoc of activeHolds.docs) {
      await holdDoc.ref.update({ status: "fulfilled" });
    }
  }

  // Create checkout request
  const requestRef = await adminDb.collection("checkoutRequests").add({
    bookId: data.bookDisplayId,
    bookTitle: data.bookTitle,
    bookDocId: data.bookDocId,
    requesterId: data.requesterDisplayId,
    requesterName: data.requesterName,
    requesterDocId: data.requesterDocId,
    status: "pending",
    requestedAt: Timestamp.now(),
    reviewedAt: null,
    reviewedBy: null,
    pickupWindows: [],
    selectedWindowIndex: null,
    pickupNotes: "",
    completedAt: null,
    transactionId: null,
    createdAt: Timestamp.now(),
  });

  // Notify all admins
  const admins = await adminDb
    .collection("members")
    .where("role", "==", "admin")
    .get();
  for (const adminDoc of admins.docs) {
    const adminData = adminDoc.data();
    await createNotificationAction({
      recipientId: adminData.displayId,
      recipientDocId: adminDoc.id,
      type: "checkout_request",
      title: "New checkout request",
      message: `${data.requesterName} requested "${data.bookTitle}"`,
      linkTo: "/admin/checkout-requests",
    });
  }

  return { success: true, requestId: requestRef.id };
}

export async function approveCheckoutRequestAction(data: {
  requestId: string;
  reviewerId: string; // admin displayId
  pickupWindows: PickupWindow[];
  pickupNotes?: string;
}) {
  if (data.pickupWindows.length < 3) {
    return { success: false, error: "At least 3 pickup windows are required" };
  }

  const requestRef = adminDb.doc(`checkoutRequests/${data.requestId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    return { success: false, error: "Request not found" };
  }
  const request = requestSnap.data()!;
  if (request.status !== "pending") {
    return { success: false, error: "Request is no longer pending" };
  }

  // Update request with multiple pickup windows
  await requestRef.update({
    status: "approved",
    reviewedAt: Timestamp.now(),
    reviewedBy: data.reviewerId,
    pickupWindows: data.pickupWindows,
    selectedWindowIndex: null,
    pickupNotes: data.pickupNotes || "",
  });

  // Notify the member
  await createNotificationAction({
    recipientId: request.requesterId,
    recipientDocId: request.requesterDocId,
    type: "request_approved",
    title: "Checkout approved!",
    message: `Your request for "${request.bookTitle}" has been approved. Please select a pickup time.`,
    linkTo: "/my/dashboard",
  });

  return { success: true };
}

export async function selectPickupWindowAction(data: {
  requestId: string;
  selectedWindowIndex: number;
  memberDocId: string;
}) {
  const requestRef = adminDb.doc(`checkoutRequests/${data.requestId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    return { success: false, error: "Request not found" };
  }
  const request = requestSnap.data()!;

  if (request.status !== "approved") {
    return { success: false, error: "Request is not in approved status" };
  }
  if (request.selectedWindowIndex !== null) {
    return { success: false, error: "A pickup window has already been selected" };
  }

  const windows = request.pickupWindows as PickupWindow[];
  if (data.selectedWindowIndex < 0 || data.selectedWindowIndex >= windows.length) {
    return { success: false, error: "Invalid window selection" };
  }

  const chosen = windows[data.selectedWindowIndex];

  // Update request to scheduled
  await requestRef.update({
    status: "scheduled",
    selectedWindowIndex: data.selectedWindowIndex,
  });

  // Create calendar event
  await adminDb.collection("calendarEvents").add({
    checkoutRequestId: data.requestId,
    bookId: request.bookId,
    bookTitle: request.bookTitle,
    memberId: request.requesterId,
    memberName: request.requesterName,
    memberDocId: request.requesterDocId,
    adminId: request.reviewedBy,
    date: chosen.date,
    startTime: chosen.startTime,
    endTime: chosen.endTime,
    type: "pickup",
    createdAt: Timestamp.now(),
  });

  // Notify all admins
  const admins = await adminDb
    .collection("members")
    .where("role", "==", "admin")
    .get();
  for (const adminDoc of admins.docs) {
    const adminData = adminDoc.data();
    await createNotificationAction({
      recipientId: adminData.displayId,
      recipientDocId: adminDoc.id,
      type: "window_selected",
      title: "Pickup time selected",
      message: `${request.requesterName} selected pickup for "${request.bookTitle}": ${chosen.date} (${chosen.startTime}–${chosen.endTime})`,
      linkTo: "/admin/checkout-requests",
    });
  }

  return { success: true };
}

export async function completeCheckoutRequestAction(data: {
  requestId: string;
}) {
  const requestRef = adminDb.doc(`checkoutRequests/${data.requestId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    return { success: false, error: "Request not found" };
  }
  const request = requestSnap.data()!;
  if (request.status !== "approved" && request.status !== "scheduled") {
    return { success: false, error: "Request must be approved or scheduled before completing" };
  }

  // Get book condition for checkout
  const bookRef = adminDb.doc(`books/${request.bookDocId}`);
  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) {
    return { success: false, error: "Book not found" };
  }
  const book = bookSnap.data()!;

  // Call the existing checkout action to create the real transaction
  const checkoutResult = await checkoutBookAction({
    bookDocId: request.bookDocId,
    bookDisplayId: request.bookId,
    bookTitle: request.bookTitle,
    borrowerDocId: request.requesterDocId,
    borrowerDisplayId: request.requesterId,
    borrowerName: request.requesterName,
    conditionAtCheckout: book.condition || "Good",
  });

  if (!checkoutResult.success) {
    return { success: false, error: checkoutResult.error };
  }

  // Update request to completed
  await requestRef.update({
    status: "completed",
    completedAt: Timestamp.now(),
    transactionId: checkoutResult.displayId || null,
  });

  return { success: true, transactionId: checkoutResult.displayId };
}

export async function cancelCheckoutRequestAction(data: {
  requestId: string;
  cancelledBy: "member" | "admin";
  cancellerName: string;
}) {
  const requestRef = adminDb.doc(`checkoutRequests/${data.requestId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    return { success: false, error: "Request not found" };
  }
  const request = requestSnap.data()!;
  if (request.status !== "pending" && request.status !== "approved" && request.status !== "scheduled") {
    return { success: false, error: "Request cannot be cancelled" };
  }

  // Set book back to "Available"
  const bookRef = adminDb.doc(`books/${request.bookDocId}`);
  await bookRef.update({
    status: "Available",
    updatedAt: Timestamp.now(),
  });

  // If scheduled, delete the associated calendar event
  if (request.status === "scheduled") {
    const calendarEvents = await adminDb
      .collection("calendarEvents")
      .where("checkoutRequestId", "==", data.requestId)
      .get();
    for (const eventDoc of calendarEvents.docs) {
      await eventDoc.ref.delete();
    }
  }

  // Update request status
  await requestRef.update({
    status: "cancelled",
    reviewedAt: Timestamp.now(),
  });

  // Notify the other party
  if (data.cancelledBy === "admin") {
    // Notify member
    await createNotificationAction({
      recipientId: request.requesterId,
      recipientDocId: request.requesterDocId,
      type: "request_cancelled",
      title: "Request cancelled",
      message: `Your request for "${request.bookTitle}" was cancelled by an admin.`,
      linkTo: "/my/dashboard",
    });
  } else {
    // Notify all admins
    const admins = await adminDb
      .collection("members")
      .where("role", "==", "admin")
      .get();
    for (const adminDoc of admins.docs) {
      const adminData = adminDoc.data();
      await createNotificationAction({
        recipientId: adminData.displayId,
        recipientDocId: adminDoc.id,
        type: "request_cancelled",
        title: "Request cancelled by member",
        message: `${data.cancellerName} cancelled their request for "${request.bookTitle}"`,
        linkTo: "/admin/checkout-requests",
      });
    }
  }

  return { success: true };
}
