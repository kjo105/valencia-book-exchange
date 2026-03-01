"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Book } from "@/lib/validators";
import type { Settings } from "@/lib/validators";
import { requestCheckoutAction } from "@/actions/checkout-requests";
import { placeHoldAction } from "@/actions/holds";
import { formatAuthor, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, AlertCircle, Clock } from "lucide-react";
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
  const [holdSubmitting, setHoldSubmitting] = useState(false);
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

        if (bookData.status === "Pending Pickup") {
          setError("This book has already been requested and is awaiting pickup.");
        } else if (bookData.status !== "Available") {
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

  async function handleRequestCheckout() {
    if (!book || !member) return;
    setSubmitting(true);

    try {
      const result = await requestCheckoutAction({
        bookDocId,
        bookDisplayId: book.displayId,
        bookTitle: book.title,
        requesterDocId: member.id,
        requesterDisplayId: member.displayId,
        requesterName: `${member.lastName}, ${member.firstName}`,
      });

      if (!result.success) {
        toast.error(result.error || "Request failed");
      } else {
        setSuccess(true);
        toast.success("Request submitted! You'll be notified when your pickup is scheduled.");
        setTimeout(() => router.push("/my/dashboard"), 2000);
      }
    } catch (err) {
      toast.error("Request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlaceHold() {
    if (!book || !member) return;
    setHoldSubmitting(true);

    try {
      const result = await placeHoldAction({
        bookDocId,
        bookDisplayId: book.displayId,
        bookTitle: book.title,
        holderDocId: member.id,
        holderDisplayId: member.displayId,
        holderName: `${member.lastName}, ${member.firstName}`,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to place hold");
      } else {
        toast.success("Hold placed! You have 24 hours to pick up this book.");
        setTimeout(() => router.push("/my/dashboard"), 2000);
      }
    } catch (err) {
      toast.error("Failed to place hold. Please try again.");
    } finally {
      setHoldSubmitting(false);
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
        <h2 className="text-2xl font-bold">Request Submitted!</h2>
        <p className="text-muted-foreground">
          You&apos;ll be notified when your pickup for &quot;{book?.title}&quot; is scheduled.
        </p>
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    );
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (settings?.checkoutDurationDays || 21));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">Request Checkout</h1>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            {book?.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                className="h-36 w-auto rounded border object-cover shrink-0"
              />
            ) : (
              <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded border border-dashed bg-muted">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle>{book?.title}</CardTitle>
              <CardDescription className="mt-1">
                {book ? formatAuthor(book.authorLast, book.authorFirst) : ""}
              </CardDescription>
            </div>
          </div>
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
              <p className="text-muted-foreground">Loan Period</p>
              <p className="font-medium">{settings?.checkoutDurationDays || 21} days</p>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            An admin will review your request and schedule a pickup time.
            You&apos;ll be notified when it&apos;s approved.
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={handleRequestCheckout}
              disabled={submitting || holdSubmitting || book?.status !== "Available"}
            >
              {submitting ? "Submitting..." : "Request Checkout"}
            </Button>
            {book?.status === "Available" && (
              <Button
                variant="secondary"
                onClick={handlePlaceHold}
                disabled={submitting || holdSubmitting}
              >
                <Clock className="mr-2 h-4 w-4" />
                {holdSubmitting ? "Placing..." : "Place 24-Hour Hold"}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/checkout/scan">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
