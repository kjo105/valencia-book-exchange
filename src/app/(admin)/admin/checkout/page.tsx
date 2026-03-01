"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Book, Member, Settings } from "@/lib/validators";
import { checkoutBookAction } from "@/actions/checkout";
import { fulfillHoldAction } from "@/actions/holds";
import { formatAuthor } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, BookPlus, Search, AlertCircle, Clock } from "lucide-react";

export default function AdminCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const holdId = searchParams.get("holdId");
  const prefillBookId = searchParams.get("bookId");
  const prefillMemberId = searchParams.get("memberId");

  const [holdBanner, setHoldBanner] = useState("");
  const [bookIdInput, setBookIdInput] = useState("");
  const [book, setBook] = useState<Book | null>(null);
  const [bookDocId, setBookDocId] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load settings and members on mount
  useEffect(() => {
    async function load() {
      setMembersLoading(true);
      try {
        const [settingsSnap, membersSnap] = await Promise.all([
          getDoc(doc(db, "settings", "config")),
          getDocs(
            query(
              collection(db, "members"),
              where("isActive", "==", true)
            )
          ),
        ]);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as Settings);
        }
        const allMembers = membersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Member)
          .sort((a, b) => a.lastName.localeCompare(b.lastName));
        setMembers(allMembers);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setMembersLoading(false);
      }
    }
    load();
  }, []);

  // Pre-populate from hold fulfillment query params
  useEffect(() => {
    if (!prefillBookId || !prefillMemberId || members.length === 0) return;

    async function prefill() {
      // Look up the book
      const booksQuery = query(
        collection(db, "books"),
        where("displayId", "==", prefillBookId)
      );
      const snap = await getDocs(booksQuery);
      if (!snap.empty) {
        const bookDoc = snap.docs[0];
        const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book;
        setBook(bookData);
        setBookDocId(bookDoc.id);
        setBookIdInput(prefillBookId!);
      }

      // Select the member
      const member = members.find((m) => m.displayId === prefillMemberId);
      if (member) {
        setSelectedMemberId(member.id);
        setSelectedMember(member);
        setHoldBanner(
          `Fulfilling hold for ${member.firstName} ${member.lastName}`
        );
      }
    }
    prefill();
  }, [prefillBookId, prefillMemberId, members]);

  // Look up book by displayId
  async function handleBookLookup(e: React.FormEvent) {
    e.preventDefault();
    const raw = bookIdInput.trim().toUpperCase();
    if (!raw) return;

    let displayId = raw;
    if (/^\d{1,4}$/.test(raw)) {
      displayId = `BID-${raw.padStart(4, "0")}`;
    } else if (!raw.startsWith("BID-")) {
      displayId = `BID-${raw}`;
    }

    setBookLoading(true);
    setBookError("");
    setBook(null);

    try {
      const booksQuery = query(
        collection(db, "books"),
        where("displayId", "==", displayId)
      );
      const snap = await getDocs(booksQuery);

      if (snap.empty) {
        setBookError("Book not found.");
        return;
      }

      const bookDoc = snap.docs[0];
      const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book;
      setBook(bookData);
      setBookDocId(bookDoc.id);

      if (bookData.status !== "Available" && !(bookData.status === "On Hold" && holdId)) {
        setBookError("This book is not available for checkout.");
      }
    } catch {
      setBookError("Failed to look up book.");
    } finally {
      setBookLoading(false);
    }
  }

  // When member selection changes, look up details
  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedMember(null);
      return;
    }
    const m = members.find((m) => m.id === selectedMemberId) || null;
    setSelectedMember(m);
  }, [selectedMemberId, members]);

  async function handleCheckout() {
    if (!book || !selectedMember || !settings) return;
    setSubmitting(true);

    try {
      // If fulfilling a hold, complete the hold first
      if (holdId) {
        const holdResult = await fulfillHoldAction({ holdDocId: holdId });
        if (!holdResult.success) {
          toast.error(holdResult.error || "Failed to fulfill hold");
          setSubmitting(false);
          return;
        }
      }

      const result = await checkoutBookAction({
        bookDocId,
        bookDisplayId: book.displayId,
        bookTitle: book.title,
        borrowerDocId: selectedMember.id,
        borrowerDisplayId: selectedMember.displayId,
        borrowerName: `${selectedMember.lastName}, ${selectedMember.firstName}`,
        conditionAtCheckout: book.condition,
      });

      if (!result.success) {
        toast.error(result.error || "Checkout failed");
      } else {
        toast.success(
          `Checked out "${book.title}" to ${selectedMember.firstName} ${selectedMember.lastName}`
        );
        router.push("/admin/transactions");
      }
    } catch {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canCheckout =
    book &&
    (book.status === "Available" || (book.status === "On Hold" && holdId)) &&
    selectedMember &&
    !bookError;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Checkout Book for Member</h1>

      {holdBanner && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          {holdBanner}
        </div>
      )}

      {/* Step 1: Book Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Find Book</CardTitle>
          <CardDescription>
            Enter or scan the Book ID (e.g. BID-0001)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBookLookup} className="flex gap-2">
            <Input
              placeholder="BID-0001"
              value={bookIdInput}
              onChange={(e) => setBookIdInput(e.target.value)}
            />
            <Button type="submit" disabled={bookLoading}>
              <Search className="mr-2 h-4 w-4" />
              {bookLoading ? "Looking up..." : "Look Up"}
            </Button>
          </form>

          {bookError && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {bookError}
            </p>
          )}

          {book && (
            <div className="mt-4 flex gap-4">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={`Cover of ${book.title}`}
                  className="h-32 w-auto rounded border object-cover shrink-0"
                />
              ) : (
                <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded border border-dashed bg-muted">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-1">
                <p className="font-semibold">{book.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatAuthor(book.authorLast, book.authorFirst)}
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline">{book.displayId}</Badge>
                  <Badge variant="secondary">{book.condition}</Badge>
                  <Badge
                    variant={
                      book.status === "Available" ? "default" : "destructive"
                    }
                  >
                    {book.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Member */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 2: Select Member</CardTitle>
          <CardDescription>
            Choose which member is checking out this book
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Member</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
              disabled={membersLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    membersLoading ? "Loading members..." : "Select a member"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.lastName}, {m.firstName} ({m.displayId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMember && (
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">
                  {selectedMember.firstName} {selectedMember.lastName}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Books out:</span>{" "}
                <span className="font-medium">
                  {selectedMember.booksCheckedOut ?? 0}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  / {settings?.maxBooksPerMember ?? 1}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm */}
      <div className="flex gap-2">
        <Button
          onClick={handleCheckout}
          disabled={!canCheckout || submitting}
          size="lg"
        >
          <BookPlus className="mr-2 h-4 w-4" />
          {submitting ? "Processing..." : "Confirm Checkout"}
        </Button>
      </div>
    </div>
  );
}
