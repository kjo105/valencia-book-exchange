"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Book } from "@/lib/validators";
import type { Settings } from "@/lib/validators";
import { checkoutBookAction } from "@/actions/checkout";
import { formatAuthor, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutConfirmPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const { member } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [bookDocId, setBookDocId] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        // Fetch book by displayId
        const booksQuery = query(
          collection(db, "books"),
          where("displayId", "==", bookId)
        );
        const bookSnap = await getDocs(booksQuery);

        if (bookSnap.empty) {
          setError("Book not found. Please check the ID and try again.");
          setLoading(false);
          return;
        }

        const bookDoc = bookSnap.docs[0];
        const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book;
        setBook(bookData);
        setBookDocId(bookDoc.id);

        if (bookData.status !== "Available") {
          setError("This book is not available for checkout.");
        }

        // Fetch settings
        const settingsSnap = await getDoc(doc(db, "settings", "config"));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as Settings);
        }
      } catch (err) {
        setError("Failed to load book details.");
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [bookId]);

  async function handleCheckout() {
    if (!book || !member) return;
    setSubmitting(true);

    try {
      const result = await checkoutBookAction({
        bookDocId,
        bookDisplayId: book.displayId,
        bookTitle: book.title,
        borrowerDocId: member.id,
        borrowerDisplayId: member.displayId,
        borrowerName: `${member.lastName}, ${member.firstName}`,
        conditionAtCheckout: book.condition,
      });

      if (!result.success) {
        toast.error(result.error || "Checkout failed");
      } else {
        setSuccess(true);
        toast.success("Book checked out successfully!");
        setTimeout(() => router.push("/my/dashboard"), 2000);
      }
    } catch (err) {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <BookOpen className="h-12 w-12 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-semibold">Oops!</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href="/checkout/scan">Try Again</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">Checked Out!</h2>
        <p className="text-muted-foreground">Enjoy reading &quot;{book?.title}&quot;</p>
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    );
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (settings?.checkoutDurationDays || 21));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">Confirm Checkout</h1>

      <Card>
        <CardHeader>
          <CardTitle>{book?.title}</CardTitle>
          <CardDescription>
            {book ? formatAuthor(book.authorLast, book.authorFirst) : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Genre</p>
              <Badge variant="outline">{book?.genre}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Condition</p>
              <Badge variant="secondary">{book?.condition}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge
                variant={book?.status === "Available" ? "default" : "destructive"}
              >
                {book?.status}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium">{formatDate(dueDate)}</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleCheckout}
              disabled={submitting || book?.status !== "Available"}
            >
              {submitting ? "Processing..." : "Confirm Checkout"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/checkout/scan">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
