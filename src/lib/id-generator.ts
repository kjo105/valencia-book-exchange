import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

type IdType = "book" | "member" | "transaction";

const PREFIX_MAP: Record<IdType, string> = {
  book: "BID",
  member: "MID",
  transaction: "TID",
};

const FIELD_MAP: Record<IdType, string> = {
  book: "nextBookId",
  member: "nextMemberId",
  transaction: "nextTransactionId",
};

export function formatDisplayId(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, "0")}`;
}

export async function generateDisplayId(type: IdType): Promise<string> {
  const settingsRef = doc(db, "settings", "config");
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    throw new Error("Settings document not found");
  }

  const field = FIELD_MAP[type];
  const nextId = settingsSnap.data()[field] as number;
  const prefix = PREFIX_MAP[type];

  // Increment the counter
  await updateDoc(settingsRef, { [field]: nextId + 1 });

  return formatDisplayId(prefix, nextId);
}
