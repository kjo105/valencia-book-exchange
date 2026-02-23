import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Book, Member, Transaction, MonetaryDonation, Expense, Settings } from "./validators";

// ─── Generic Helpers ────────────────────────────────────────────

function docToData<T>(snap: DocumentData): T {
  return { id: snap.id, ...snap.data() } as T;
}

// ─── Books ──────────────────────────────────────────────────────

export async function getBooks(constraints: QueryConstraint[] = []): Promise<Book[]> {
  const q = query(collection(db, "books"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Book>(d));
}

export async function getBookById(id: string): Promise<Book | null> {
  const snap = await getDoc(doc(db, "books", id));
  return snap.exists() ? docToData<Book>(snap) : null;
}

export async function getBookByDisplayId(displayId: string): Promise<Book | null> {
  const q = query(collection(db, "books"), where("displayId", "==", displayId), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : docToData<Book>(snap.docs[0]);
}

export async function createBook(data: Omit<Book, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "books"), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateBook(id: string, data: Partial<Book>): Promise<void> {
  await updateDoc(doc(db, "books", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteBook(id: string): Promise<void> {
  await deleteDoc(doc(db, "books", id));
}

// ─── Members ────────────────────────────────────────────────────

export async function getMembers(constraints: QueryConstraint[] = []): Promise<Member[]> {
  const q = query(collection(db, "members"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Member>(d));
}

export async function getMemberById(id: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, "members", id));
  return snap.exists() ? docToData<Member>(snap) : null;
}

export async function getMemberByDisplayId(displayId: string): Promise<Member | null> {
  const q = query(collection(db, "members"), where("displayId", "==", displayId), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : docToData<Member>(snap.docs[0]);
}

export async function getMemberByFirebaseUid(uid: string): Promise<Member | null> {
  const q = query(collection(db, "members"), where("firebaseUid", "==", uid), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : docToData<Member>(snap.docs[0]);
}

export async function createMember(data: Omit<Member, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "members"), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateMember(id: string, data: Partial<Member>): Promise<void> {
  await updateDoc(doc(db, "members", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ─── Transactions ───────────────────────────────────────────────

export async function getTransactions(constraints: QueryConstraint[] = []): Promise<Transaction[]> {
  const q = query(collection(db, "transactions"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Transaction>(d));
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const snap = await getDoc(doc(db, "transactions", id));
  return snap.exists() ? docToData<Transaction>(snap) : null;
}

export async function createTransaction(data: Omit<Transaction, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "transactions"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
  await updateDoc(doc(db, "transactions", id), data);
}

// ─── Monetary Donations ─────────────────────────────────────────

export async function getMonetaryDonations(constraints: QueryConstraint[] = []): Promise<MonetaryDonation[]> {
  const q = query(collection(db, "monetaryDonations"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<MonetaryDonation>(d));
}

export async function createMonetaryDonation(data: Omit<MonetaryDonation, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "monetaryDonations"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateMonetaryDonation(id: string, data: Partial<MonetaryDonation>): Promise<void> {
  await updateDoc(doc(db, "monetaryDonations", id), data);
}

export async function deleteMonetaryDonation(id: string): Promise<void> {
  await deleteDoc(doc(db, "monetaryDonations", id));
}

// ─── Expenses ───────────────────────────────────────────────────

export async function getExpenses(constraints: QueryConstraint[] = []): Promise<Expense[]> {
  const q = query(collection(db, "expenses"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToData<Expense>(d));
}

export async function createExpense(data: Omit<Expense, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "expenses"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(doc(db, "expenses", id), data);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, "expenses", id));
}

// ─── Settings ───────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const snap = await getDoc(doc(db, "settings", "config"));
  if (!snap.exists()) {
    // Return defaults
    return {
      checkoutDurationDays: 21,
      maxBooksPerMember: 3,
      creditCostCheckout: 1,
      creditRewardDonation: 1,
      nextBookId: 92,
      nextMemberId: 5,
      nextTransactionId: 1,
    };
  }
  return snap.data() as Settings;
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
  await updateDoc(doc(db, "settings", "config"), data);
}
