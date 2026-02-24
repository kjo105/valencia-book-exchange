// Genre options for books
export const GENRES = [
  "Adventure",
  "Biography",
  "Children's",
  "Classic",
  "Contemporary Fiction",
  "Crime / Thriller",
  "Dystopian",
  "Fantasy",
  "Graphic Novel",
  "Historical Fiction",
  "Horror",
  "Humor",
  "Literary Fiction",
  "Memoir",
  "Mystery",
  "Non-Fiction",
  "Philosophy",
  "Poetry",
  "Romance",
  "Science Fiction",
  "Self-Help",
  "Short Stories",
  "Travel",
  "True Crime",
  "Young Adult",
  "Other",
] as const;

export type Genre = (typeof GENRES)[number];

// Book condition options (ordered best to worst)
export const CONDITIONS = [
  "New",
  "Like New",
  "Very Good",
  "Good",
  "Fair",
  "Poor",
] as const;

export type Condition = (typeof CONDITIONS)[number];

// Book status options
export const BOOK_STATUSES = [
  "Available",
  "Checked Out",
  "On Hold",
  "Lost",
  "Retired",
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

// Member roles
export const ROLES = ["member", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Monetary donation purpose
export const DONATION_PURPOSES = [
  "general",
  "books",
  "supplies",
  "rent",
] as const;

export type DonationPurpose = (typeof DONATION_PURPOSES)[number];

// Expense categories
export const EXPENSE_CATEGORIES = [
  "books",
  "supplies",
  "rent",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Display ID prefixes
export const ID_PREFIXES = {
  book: "BID",
  member: "MID",
  transaction: "TID",
} as const;
