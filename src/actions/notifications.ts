"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function createNotificationAction(data: {
  recipientId: string; // member displayId
  recipientDocId: string;
  type: "checkout_request" | "request_approved" | "request_cancelled" | "window_selected" | "general";
  title: string;
  message: string;
  linkTo?: string | null;
}) {
  const ref = await adminDb.collection("notifications").add({
    recipientId: data.recipientId,
    recipientDocId: data.recipientDocId,
    type: data.type,
    title: data.title,
    message: data.message,
    linkTo: data.linkTo || null,
    read: false,
    createdAt: Timestamp.now(),
  });

  // FUTURE: email hook — send email notification to recipient here

  return { success: true, notificationId: ref.id };
}

export async function markNotificationReadAction(data: {
  notificationId: string;
}) {
  const ref = adminDb.doc(`notifications/${data.notificationId}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return { success: false, error: "Notification not found" };
  }
  await ref.update({ read: true });
  return { success: true };
}

export async function markAllNotificationsReadAction(data: {
  recipientDocId: string;
}) {
  const snap = await adminDb
    .collection("notifications")
    .where("recipientDocId", "==", data.recipientDocId)
    .where("read", "==", false)
    .get();

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });
  await batch.commit();

  return { success: true, count: snap.size };
}
