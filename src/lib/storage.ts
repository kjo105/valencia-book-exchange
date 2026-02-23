import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

export async function uploadBookCover(
  bookId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `covers/${bookId}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteBookCover(bookId: string): Promise<void> {
  const storageRef = ref(storage, `covers/${bookId}`);
  await deleteObject(storageRef);
}
