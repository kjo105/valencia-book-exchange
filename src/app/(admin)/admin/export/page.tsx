"use client";

import { useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, BookOpen, Users, ArrowLeftRight, HandCoins, Receipt } from "lucide-react";
import { toast } from "sonner";

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function timestampToString(ts: { toDate?: () => Date } | null): string {
  if (!ts || !ts.toDate) return "";
  return ts.toDate().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ExportPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  async function exportBooks() {
    setExporting("books");
    try {
      const snap = await getDocs(query(collection(db, "books"), orderBy("displayId")));
      const data = snap.docs.map((d) => {
        const b = d.data();
        return {
          DisplayId: b.displayId,
          Title: b.title,
          AuthorLast: b.authorLast,
          AuthorFirst: b.authorFirst,
          Author2Last: b.author2Last || "",
          Author2First: b.author2First || "",
          Genre: b.genre,
          IsYA: b.isYA ? "Yes" : "No",
          Condition: b.condition,
          Status: b.status,
          TimesCheckedOut: b.timesCheckedOut,
          DonorId: b.donorId || "",
          DonorName: b.donorName || "",
          DonationDate: timestampToString(b.donationDate),
          Notes: b.notes || "",
        };
      });
      downloadCSV(data, `books-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${data.length} books`);
    } catch (err) {
      toast.error("Export failed");
    }
    setExporting(null);
  }

  async function exportMembers() {
    setExporting("members");
    try {
      const snap = await getDocs(query(collection(db, "members"), orderBy("displayId")));
      const data = snap.docs.map((d) => {
        const m = d.data();
        return {
          DisplayId: m.displayId,
          LastName: m.lastName,
          FirstName: m.firstName,
          Phone: m.phone || "",
          Email: m.email || "",
          Role: m.role,
          Credits: m.credits,
          TotalDonations: m.totalDonations,
          BooksCheckedOut: m.booksCheckedOut,
          IsActive: m.isActive ? "Yes" : "No",
          Notes: m.notes || "",
        };
      });
      downloadCSV(data, `members-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${data.length} members`);
    } catch (err) {
      toast.error("Export failed");
    }
    setExporting(null);
  }

  async function exportTransactions() {
    setExporting("transactions");
    try {
      const snap = await getDocs(query(collection(db, "transactions"), orderBy("checkoutDate", "desc")));
      const data = snap.docs.map((d) => {
        const t = d.data();
        return {
          DisplayId: t.displayId,
          BookId: t.bookId,
          BookTitle: t.bookTitle,
          BorrowerId: t.borrowerId,
          BorrowerName: t.borrowerName,
          CheckoutDate: timestampToString(t.checkoutDate),
          DueDate: timestampToString(t.dueDate),
          CheckinDate: timestampToString(t.checkinDate),
          IsCheckedOut: t.isCheckedOut ? "Yes" : "No",
          DurationDays: t.durationDays ?? "",
          ConditionAtCheckout: t.conditionAtCheckout,
          ConditionAtCheckin: t.conditionAtCheckin || "",
          Notes: t.notes || "",
        };
      });
      downloadCSV(data, `transactions-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${data.length} transactions`);
    } catch (err) {
      toast.error("Export failed");
    }
    setExporting(null);
  }

  async function exportDonations() {
    setExporting("donations");
    try {
      const snap = await getDocs(query(collection(db, "monetaryDonations"), orderBy("donationDate", "desc")));
      const data = snap.docs.map((d) => {
        const don = d.data();
        return {
          DonorName: don.donorName || "Anonymous",
          Amount: (don.amountCents / 100).toFixed(2),
          Currency: don.currency,
          DonationDate: timestampToString(don.donationDate),
          Purpose: don.purpose,
          Notes: don.notes || "",
        };
      });
      downloadCSV(data, `donations-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${data.length} donations`);
    } catch (err) {
      toast.error("Export failed");
    }
    setExporting(null);
  }

  async function exportExpenses() {
    setExporting("expenses");
    try {
      const snap = await getDocs(query(collection(db, "expenses"), orderBy("expenseDate", "desc")));
      const data = snap.docs.map((d) => {
        const e = d.data();
        return {
          Description: e.description,
          Amount: (e.amountCents / 100).toFixed(2),
          Currency: e.currency,
          ExpenseDate: timestampToString(e.expenseDate),
          Category: e.category,
          ReceiptUrl: e.receiptUrl || "",
        };
      });
      downloadCSV(data, `expenses-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported ${data.length} expenses`);
    } catch (err) {
      toast.error("Export failed");
    }
    setExporting(null);
  }

  const exports = [
    { key: "books", label: "Books", icon: BookOpen, desc: "All books with details", fn: exportBooks },
    { key: "members", label: "Members", icon: Users, desc: "All member records", fn: exportMembers },
    { key: "transactions", label: "Transactions", icon: ArrowLeftRight, desc: "All checkout/checkin records", fn: exportTransactions },
    { key: "donations", label: "Monetary Donations", icon: HandCoins, desc: "All monetary donations", fn: exportDonations },
    { key: "expenses", label: "Expenses", icon: Receipt, desc: "All expense records", fn: exportExpenses },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Export Data</h1>
        <p className="text-muted-foreground">Download CSV files for Google Sheets backup</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exports.map(({ key, label, icon: Icon, desc, fn }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5" />
                {label}
              </CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={fn}
                disabled={exporting !== null}
                className="w-full"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting === key ? "Exporting..." : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
