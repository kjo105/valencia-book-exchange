"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function createMemberAction(data: {
  lastName: string;
  firstName: string;
  phone: string;
  email: string;
  role: string;
  isActive: boolean;
  notes: string;
}) {
  const settingsRef = adminDb.doc("settings/config");
  const settings = await settingsRef.get();
  const nextId = settings.data()?.nextMemberId || 1;
  const displayId = `MID-${String(nextId).padStart(4, "0")}`;

  await adminDb.collection("members").add({
    ...data,
    displayId,
    firebaseUid: null,
    credits: 0,
    totalDonations: 0,
    booksCheckedOut: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  await settingsRef.update({ nextMemberId: nextId + 1 });

  return { success: true, displayId };
}

export async function updateMemberAction(
  docId: string,
  data: {
    lastName?: string;
    firstName?: string;
    phone?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    notes?: string;
    credits?: number;
  }
) {
  await adminDb.doc(`members/${docId}`).update({
    ...data,
    updatedAt: Timestamp.now(),
  });

  return { success: true };
}

export async function linkMemberToAuth(docId: string, firebaseUid: string) {
  await adminDb.doc(`members/${docId}`).update({
    firebaseUid,
    updatedAt: Timestamp.now(),
  });

  return { success: true };
}
