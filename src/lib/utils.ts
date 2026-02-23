import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a Firestore Timestamp or Date to dd/mm/yyyy
export function formatDate(
  date: Timestamp | Date | null | undefined
): string {
  if (!date) return "—";
  const d = date instanceof Timestamp ? date.toDate() : date;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Format cents to EUR display
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

// Parse EUR amount string to cents
export function euroToCents(amount: string | number): number {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return Math.round(num * 100);
}

// Format author name for display: "Last, First"
export function formatAuthor(last: string, first?: string | null): string {
  if (!first) return last;
  return `${last}, ${first}`;
}

// Parse "Last, First" format to separate fields
export function parseAuthorName(fullName: string): {
  last: string;
  first: string;
} {
  const parts = fullName.split(",").map((s) => s.trim());
  return {
    last: parts[0] || "",
    first: parts[1] || "",
  };
}

// Calculate days between two dates
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

// Check if a date is overdue
export function isOverdue(dueDate: Timestamp | Date | null | undefined): boolean {
  if (!dueDate) return false;
  const d = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
  return d < new Date();
}
