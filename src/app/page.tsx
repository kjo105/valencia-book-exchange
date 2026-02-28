"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Book, Hold } from "@/lib/validators";
import { formatAuthor } from "@/lib/utils";
import { cancelHoldAction, expireHoldIfNeeded } from "@/actions/holds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function HomePage() {
  const { member, loading: authLoading } = useAuth();
  const [activeHolds, setActiveHolds] = useState<Hold[]>([]);
  const [newArrivals, setNewArrivals] = useState<Book[]>([]);
  const [cancellingHold, setCancellingHold] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!member) return;

    async function fetchData() {
      setDataLoading(true);
      try {
        // Fetch active holds for this member
        const holdsQuery = query(
          collection(db, "holds"),
          where("holderId", "==", member!.displayId),
          where("status", "==", "active")
        );
        const holdsSnap = await getDocs(holdsQuery);
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

        // Fetch 4 most recently added available books
        const booksQuery = query(
          collection(db, "books"),
          where("status", "==", "Available"),
          orderBy("createdAt", "desc"),
          limit(4)
        );
        const booksSnap = await getDocs(booksQuery);
        const books = booksSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Book
        );
        setNewArrivals(books);
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setDataLoading(false);
      }
    }

    fetchData();
  }, [member]);

  async function handleCancelHold(hold: Hold) {
    setCancellingHold(hold.id);
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
      setCancellingHold(null);
    }
  }

  function getTimeRemaining(expiresAt: { toDate: () => Date }) {
    const now = new Date();
    const expires = expiresAt.toDate();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  }

  const isLoggedIn = !authLoading && !!member;

  return (
    <div>
      {/* Personalized section for logged-in members */}
      {isLoggedIn && (
        <section className="border-b bg-gradient-to-b from-primary/5 to-background py-10 md:py-14">
          <div className="container px-4 mx-auto space-y-10">
            {/* Welcome banner */}
            <h1 className="text-3xl font-bold">
              Welcome back, {member.firstName}!
            </h1>

            {/* Active Holds */}
            {activeHolds.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Active Holds</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeHolds.map((hold) => (
                    <Card key={hold.id} className="border-amber-300">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {hold.bookTitle}
                          </p>
                          <Badge variant="outline" className="gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {getTimeRemaining(hold.expiresAt)}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelHold(hold)}
                          disabled={cancellingHold === hold.id}
                          className="shrink-0 ml-2"
                        >
                          <X className="mr-1 h-3 w-3" />
                          {cancellingHold === hold.id
                            ? "Cancelling..."
                            : "Cancel"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* New Arrivals */}
            {!dataLoading && newArrivals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">New Arrivals</h2>
                  <Button variant="link" asChild className="text-sm">
                    <Link href="/catalog">View all</Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {newArrivals.map((book) => (
                    <Link key={book.id} href={`/catalog/${book.id}`}>
                      <Card className="hover:shadow-lg hover:border-accent/40 transition-all cursor-pointer overflow-hidden">
                        <CardContent className="flex items-center gap-3 p-3">
                          <div className="h-20 w-14 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
                            {book.coverUrl ? (
                              <img
                                src={book.coverUrl}
                                alt={`Cover of ${book.title}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm line-clamp-2">
                              {book.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {formatAuthor(book.authorLast, book.authorFirst)}
                            </p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {book.genre}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Hero — only shown for visitors (logged-in users see the welcome section) */}
      {!isLoggedIn && (
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
          <div className="container px-4 text-center mx-auto">
            <div className="mx-auto max-w-3xl space-y-6">
              <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                The Missing Chapter
              </h1>
              <div className="flex items-center justify-center gap-4">
                <span className="h-px w-12 bg-accent" />
                <p className="font-serif text-xl text-muted-foreground md:text-2xl tracking-wide">
                  Valencia Book Exchange
                </p>
                <span className="h-px w-12 bg-accent" />
              </div>
              <p className="mx-auto max-w-xl text-muted-foreground">
                A community-run book exchange in the heart of Mestalla.
                Browse, borrow, and share English books with fellow readers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button asChild size="lg">
                  <Link href="/catalog">
                    Browse Catalog
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Member Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Info cards */}
      <section className="py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="rounded-full bg-primary/10 p-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Location</h3>
              <p className="text-sm text-muted-foreground">
                Mestalla neighborhood, Valencia, Spain
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="rounded-full bg-primary/10 p-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Hours</h3>
              <p className="text-sm text-muted-foreground">
                Check with us for current availability
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-6">
              <div className="rounded-full bg-primary/10 p-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Community</h3>
              <p className="text-sm text-muted-foreground">
                Join our growing community of English-language readers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30 py-16 md:py-24">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                1
              </div>
              <h3 className="font-semibold">Donate a Book</h3>
              <p className="text-sm text-muted-foreground">
                Bring in an English book to donate and earn credits for borrowing.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                2
              </div>
              <h3 className="font-semibold">Scan &amp; Borrow</h3>
              <p className="text-sm text-muted-foreground">
                Scan the QR code inside any available book to check it out instantly.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                3
              </div>
              <h3 className="font-semibold">Return &amp; Repeat</h3>
              <p className="text-sm text-muted-foreground">
                Return within 3 weeks and pick your next great read.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
