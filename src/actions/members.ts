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

export async function selfRegisterMemberAction(data: {
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  // Check if a member already exists with this UID
  const existingByUid = await adminDb
    .collection("members")
    .where("firebaseUid", "==", data.firebaseUid)
    .limit(1)
    .get();
  if (!existingByUid.empty) {
    const doc = existingByUid.docs[0];
    return { success: true, memberId: doc.id, displayId: doc.data().displayId };
  }

  // Check if a member exists with this email (link them)
  const existingByEmail = await adminDb
    .collection("members")
    .where("email", "==", data.email)
    .limit(1)
    .get();
  if (!existingByEmail.empty) {
    const doc = existingByEmail.docs[0];
    await doc.ref.update({
      firebaseUid: data.firebaseUid,
      updatedAt: Timestamp.now(),
    });
    return { success: true, memberId: doc.id, displayId: doc.data().displayId };
  }

  // Create a new member
  const settingsRef = adminDb.doc("settings/config");
  const settings = await settingsRef.get();
  const nextId = settings.data()?.nextMemberId || 1;
  const displayId = `MID-${String(nextId).padStart(4, "0")}`;

  const ref = await adminDb.collection("members").add({
    displayId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: "",
    firebaseUid: data.firebaseUid,
    role: "member",
    credits: 0,
    totalDonations: 0,
    booksCheckedOut: 0,
    isActive: true,
    notes: "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  await settingsRef.update({ nextMemberId: nextId + 1 });

  return { success: true, memberId: ref.id, displayId };
}

export async function linkMemberToAuth(docId: string, firebaseUid: string) {
  await adminDb.doc(`members/${docId}`).update({
    firebaseUid,
    updatedAt: Timestamp.now(),
  });

  return { success: true };
}
