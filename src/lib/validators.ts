import { z } from "zod";
import {
  GENRES,
  CONDITIONS,
  BOOK_STATUSES,
  ROLES,
  DONATION_PURPOSES,
  EXPENSE_CATEGORIES,
} from "./constants";

// Book schema
export const bookSchema = z.object({
  displayId: z.string(),
  title: z.string().min(1, "Title is required"),
  authorLast: z.string().min(1, "Author last name is required"),
  authorFirst: z.string().default(""),
  author2Last: z.string().nullable().default(null),
  author2First: z.string().nullable().default(null),
  genre: z.enum(GENRES),
  isYA: z.boolean().default(false),
  condition: z.enum(CONDITIONS),
  status: z.enum(BOOK_STATUSES).default("Available"),
  timesCheckedOut: z.number().int().min(0).default(0),
  donorId: z.string().nullable().default(null),
  donorName: z.string().nullable().default(null),
  donationDate: z.any().nullable().default(null), // Firestore Timestamp
  coverUrl: z.string().nullable().default(null),
  notes: z.string().default(""),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export const bookFormSchema = bookSchema.omit({
  displayId: true,
  timesCheckedOut: true,
  createdAt: true,
  updatedAt: true,
});

export type Book = z.infer<typeof bookSchema> & { id: string };

// Member schema
export const memberSchema = z.object({
  displayId: z.string(),
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  phone: z.string().default(""),
  email: z.string().email("Invalid email").or(z.literal("")),
  firebaseUid: z.string().nullable().default(null),
  role: z.enum(ROLES).default("member"),
  credits: z.number().int().default(0),
  totalDonations: z.number().int().min(0).default(0),
  booksCheckedOut: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  notes: z.string().default(""),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export const memberFormSchema = memberSchema.omit({
  displayId: true,
  firebaseUid: true,
  credits: true,
  totalDonations: true,
  booksCheckedOut: true,
  createdAt: true,
  updatedAt: true,
});

export type Member = z.infer<typeof memberSchema> & { id: string };

// Transaction schema
export const transactionSchema = z.object({
  displayId: z.string(),
  bookId: z.string(),
  bookTitle: z.string(),
  borrowerId: z.string(),
  borrowerName: z.string(),
  checkoutDate: z.any(), // Firestore Timestamp
  dueDate: z.any(),
  checkinDate: z.any().nullable().default(null),
  isCheckedOut: z.boolean().default(true),
  durationDays: z.number().int().nullable().default(null),
  conditionAtCheckout: z.enum(CONDITIONS),
  conditionAtCheckin: z.enum(CONDITIONS).nullable().default(null),
  notes: z.string().default(""),
  createdAt: z.any(),
});

export type Transaction = z.infer<typeof transactionSchema> & { id: string };

// Monetary donation schema
export const monetaryDonationSchema = z.object({
  donorId: z.string().nullable().default(null),
  donorName: z.string().default("Anonymous"),
  amountCents: z.number().int().min(1, "Amount must be greater than 0"),
  currency: z.string().default("EUR"),
  donationDate: z.any(),
  purpose: z.enum(DONATION_PURPOSES).default("general"),
  notes: z.string().default(""),
  createdAt: z.any(),
});

export const monetaryDonationFormSchema = monetaryDonationSchema.omit({
  createdAt: true,
});

export type MonetaryDonation = z.infer<typeof monetaryDonationSchema> & {
  id: string;
};

// Expense schema
export const expenseSchema = z.object({
  amountCents: z.number().int().min(1, "Amount must be greater than 0"),
  currency: z.string().default("EUR"),
  expenseDate: z.any(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, "Description is required"),
  receiptUrl: z.string().nullable().default(null),
  createdAt: z.any(),
});

export const expenseFormSchema = expenseSchema.omit({
  createdAt: true,
});

export type Expense = z.infer<typeof expenseSchema> & { id: string };

// Hold schema
export const holdSchema = z.object({
  bookId: z.string(), // book displayId
  bookTitle: z.string(),
  bookDocId: z.string(),
  holderId: z.string(), // member displayId
  holderName: z.string(),
  holderDocId: z.string(),
  holdDate: z.any(), // Firestore Timestamp
  expiresAt: z.any(), // Firestore Timestamp
  status: z.enum(["active", "fulfilled", "cancelled", "expired"]),
  createdAt: z.any(),
});

export type Hold = z.infer<typeof holdSchema> & { id: string };

// Settings schema
export const settingsSchema = z.object({
  checkoutDurationDays: z.number().int().min(1).default(21),
  maxBooksPerMember: z.number().int().min(1).default(1),
  creditCostCheckout: z.number().int().min(0).default(1),
  creditRewardDonation: z.number().int().min(0).default(1),
  nextBookId: z.number().int().min(1).default(92),
  nextMemberId: z.number().int().min(1).default(5),
  nextTransactionId: z.number().int().min(1).default(1),
});

export type Settings = z.infer<typeof settingsSchema>;

// Pickup window schema
export const pickupWindowSchema = z.object({
  date: z.string(), // ISO date string e.g. "2026-03-01"
  startTime: z.string(), // e.g. "10:00"
  endTime: z.string(), // e.g. "14:00"
});

export type PickupWindow = z.infer<typeof pickupWindowSchema>;

// Checkout request schema
export const checkoutRequestSchema = z.object({
  bookId: z.string(), // book displayId
  bookTitle: z.string(),
  bookDocId: z.string(),
  requesterId: z.string(), // member displayId
  requesterName: z.string(),
  requesterDocId: z.string(),
  status: z.enum(["pending", "approved", "scheduled", "completed", "cancelled"]),
  requestedAt: z.any(), // Firestore Timestamp
  reviewedAt: z.any().nullable().default(null),
  reviewedBy: z.string().nullable().default(null),
  pickupWindows: z.array(pickupWindowSchema).default([]),
  selectedWindowIndex: z.number().nullable().default(null),
  pickupNotes: z.string().default(""),
  completedAt: z.any().nullable().default(null),
  transactionId: z.string().nullable().default(null),
  createdAt: z.any(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema> & {
  id: string;
};

// Calendar event schema
export const calendarEventSchema = z.object({
  checkoutRequestId: z.string(),
  bookId: z.string(),
  bookTitle: z.string(),
  memberId: z.string(), // member displayId
  memberName: z.string(),
  memberDocId: z.string(),
  adminId: z.string(), // admin displayId
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: z.literal("pickup"),
  createdAt: z.any(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema> & {
  id: string;
};

// Notification schema
export const notificationSchema = z.object({
  recipientId: z.string(), // member displayId
  recipientDocId: z.string(),
  type: z.enum([
    "checkout_request",
    "request_approved",
    "request_cancelled",
    "window_selected",
    "general",
  ]),
  title: z.string(),
  message: z.string(),
  linkTo: z.string().nullable().default(null),
  read: z.boolean().default(false),
  createdAt: z.any(),
});

export type Notification = z.infer<typeof notificationSchema> & {
  id: string;
};

// CSV import schemas
export const csvBookRowSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  authorLast: z.string().optional(),
  authorFirst: z.string().optional(),
  genre: z.string().optional(),
  condition: z.string().optional(),
  status: z.string().optional(),
  donorName: z.string().optional(),
  notes: z.string().optional(),
});

export const csvMemberRowSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
});
