"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Book, Member, Hold } from "@/lib/validators";
import {
  placeHoldAction,
  cancelHoldAction,
  expireHoldIfNeeded,
} from "@/actions/holds";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, Clock, Search, AlertCircle, CheckCircle, X } from "lucide-react";

export default function AdminHoldsPage() {
  const router = useRouter();
  const [bookIdInput, setBookIdInput] = useState("");
  const [book, setBook] = useState<Book | null>(null);
  const [bookDocId, setBookDocId] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [activeHolds, setActiveHolds] = useState<Hold[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load members and active holds on mount
  useEffect(() => {
    async function load() {
      setMembersLoading(true);
      try {
        const membersSnap = await getDocs(
          query(collection(db, "members"), where("isActive", "==", true))
        );
        const allMembers = membersSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Member)
          .sort((a, b) => a.lastName.localeCompare(b.lastName));
        setMembers(allMembers);
      } catch (err) {
        console.error("Failed to load members:", err);
      } finally {
        setMembersLoading(false);
      }
    }
    load();
    loadActiveHolds();
  }, []);

  async function loadActiveHolds() {
    setHoldsLoading(true);
    try {
      const holdsSnap = await getDocs(
        query(collection(db, "holds"), where("status", "==", "active"))
      );
      const holds = holdsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Hold
      );

      // Lazily expire holds
      const validHolds: Hold[] = [];
      for (const hold of holds) {
        const expired = await expireHoldIfNeeded({
          id: hold.id,
          status: hold.status,
          expiresAtMs: hold.expiresAt.toMillis(),
          bookDocId: hold.bookDocId,
        });
        if (!expired) validHolds.push(hold);
      }
      setActiveHolds(validHolds);
    } catch (err) {
      console.error("Failed to load holds:", err);
    } finally {
      setHoldsLoading(false);
    }
  }

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

      if (bookData.status !== "Available") {
        setBookError("This book is not available for hold.");
      }
    } catch {
      setBookError("Failed to look up book.");
    } finally {
      setBookLoading(false);
    }
  }

  // When member selection changes
  useEffect(() => {
    if (!selectedMemberId) {
      setSelectedMember(null);
      return;
    }
    const m = members.find((m) => m.id === selectedMemberId) || null;
    setSelectedMember(m);
  }, [selectedMemberId, members]);

  async function handlePlaceHold() {
    if (!book || !selectedMember) return;
    setSubmitting(true);

    try {
      const result = await placeHoldAction({
        bookDocId,
        bookDisplayId: book.displayId,
        bookTitle: book.title,
        holderDocId: selectedMember.id,
        holderDisplayId: selectedMember.displayId,
        holderName: `${selectedMember.lastName}, ${selectedMember.firstName}`,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to place hold");
      } else {
        toast.success(
          `Hold placed on "${book.title}" for ${selectedMember.firstName} ${selectedMember.lastName}`
        );
        // Reset form and refresh holds
        setBook(null);
        setBookDocId("");
        setBookIdInput("");
        setSelectedMemberId("");
        setSelectedMember(null);
        loadActiveHolds();
      }
    } catch {
      toast.error("Failed to place hold. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelHold(hold: Hold) {
    setActionLoading(hold.id);
    try {
      const result = await cancelHoldAction({
        holdDocId: hold.id,
        bookDocId: hold.bookDocId,
      });
      if (result.success) {
        setActiveHolds((prev) => prev.filter((h) => h.id !== hold.id));
        toast.success("Hold cancelled");
      } else {
        toast.error(result.error || "Failed to cancel hold");
      }
    } catch {
      toast.error("Failed to cancel hold");
    } finally {
      setActionLoading(null);
    }
  }

  function handleFulfillHold(hold: Hold) {
    const params = new URLSearchParams({
      holdId: hold.id,
      bookId: hold.bookId,
      memberId: hold.holderId,
    });
    router.push(`/admin/checkout?${params.toString()}`);
  }

  function getTimeRemaining(expiresAt: { toDate: () => Date }) {
    const now = new Date();
    const expires = expiresAt.toDate();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  const canPlaceHold =
    book && book.status === "Available" && selectedMember && !bookError;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Book Holds</h1>

      {/* Place Hold Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Place a Hold</CardTitle>
          <CardDescription>
            Reserve a book for a member for 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Book Lookup */}
          <div className="space-y-2">
            <Label>Step 1: Find Book</Label>
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
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {bookError}
              </p>
            )}

            {book && (
              <div className="mt-2 flex gap-4">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={`Cover of ${book.title}`}
                    className="h-24 w-auto rounded border object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded border border-dashed bg-muted">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{book.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatAuthor(book.authorLast, book.authorFirst)}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{book.displayId}</Badge>
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
          </div>

          {/* Step 2: Select Member */}
          <div className="space-y-2">
            <Label>Step 2: Select Member</Label>
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

            {selectedMember && (
              <div className="rounded-md border p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  <span className="font-medium">{selectedMember.displayId}</span>
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handlePlaceHold}
            disabled={!canPlaceHold || submitting}
          >
            <Clock className="mr-2 h-4 w-4" />
            {submitting ? "Placing Hold..." : "Place Hold"}
          </Button>
        </CardContent>
      </Card>

      {/* Active Holds Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Holds</CardTitle>
          <CardDescription>
            All currently active book holds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holdsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : activeHolds.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No active holds
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Expires In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeHolds.map((hold) => (
                  <TableRow key={hold.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{hold.bookTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {hold.bookId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{hold.holderName}</p>
                        <p className="text-sm text-muted-foreground">
                          {hold.holderId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(hold.expiresAt)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleFulfillHold(hold)}
                          disabled={actionLoading === hold.id}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Fulfill
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelHold(hold)}
                          disabled={actionLoading === hold.id}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
