"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export async function createMonetaryDonationAction(data: {
  donorId: string | null;
  donorName: string;
  amountCents: number;
  currency: string;
  donationDate: string;
  purpose: string;
  notes: string;
}) {
  await adminDb.collection("monetaryDonations").add({
    ...data,
    donationDate: Timestamp.fromDate(new Date(data.donationDate)),
    createdAt: Timestamp.now(),
  });

  return { success: true };
}

export async function updateMonetaryDonationAction(
  docId: string,
  data: {
    donorId?: string | null;
    donorName?: string;
    amountCents?: number;
    currency?: string;
    donationDate?: string;
    purpose?: string;
    notes?: string;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.donationDate) {
    updateData.donationDate = Timestamp.fromDate(new Date(data.donationDate));
  }

  await adminDb.doc(`monetaryDonations/${docId}`).update(updateData);
  return { success: true };
}

export async function deleteMonetaryDonationAction(docId: string) {
  await adminDb.doc(`monetaryDonations/${docId}`).delete();
  return { success: true };
}

export async function createExpenseAction(data: {
  amountCents: number;
  currency: string;
  expenseDate: string;
  category: string;
  description: string;
  receiptUrl: string | null;
}) {
  await adminDb.collection("expenses").add({
    ...data,
    expenseDate: Timestamp.fromDate(new Date(data.expenseDate)),
    createdAt: Timestamp.now(),
  });

  return { success: true };
}

export async function updateExpenseAction(
  docId: string,
  data: {
    amountCents?: number;
    currency?: string;
    expenseDate?: string;
    category?: string;
    description?: string;
    receiptUrl?: string | null;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.expenseDate) {
    updateData.expenseDate = Timestamp.fromDate(new Date(data.expenseDate));
  }

  await adminDb.doc(`expenses/${docId}`).update(updateData);
  return { success: true };
}

export async function deleteExpenseAction(docId: string) {
  await adminDb.doc(`expenses/${docId}`).delete();
  return { success: true };
}

export async function updateSettingsAction(data: {
  checkoutDurationDays?: number;
  maxBooksPerMember?: number;
  creditCostCheckout?: number;
  creditRewardDonation?: number;
}) {
  await adminDb.doc("settings/config").update(data);
  return { success: true };
}
