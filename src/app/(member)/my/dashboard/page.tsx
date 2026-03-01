"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Book, Transaction, Hold, CheckoutRequest } from "@/lib/validators";
import { formatDate, isOverdue } from "@/lib/utils";
import { cancelHoldAction, expireHoldIfNeeded } from "@/actions/holds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestCard } from "@/components/checkout-requests/request-card";
import { QrCode, BookOpen, CreditCard, AlertTriangle, Clock, X } from "lucide-react";
import { toast } from "sonner";

export default function MemberDashboard() {
  const { member } = useAuth();
  const [activeCheckouts, setActiveCheckouts] = useState<Transaction[]>([]);
  const [activeHolds, setActiveHolds] = useState<Hold[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CheckoutRequest[]>([]);
  const [requestCoverMap, setRequestCoverMap] = useState<Record<string, string>>({});
  const [holdCoverMap, setHoldCoverMap] = useState<Record<string, string>>({});
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cancellingHold, setCancellingHold] = useState<string | null>(null);

  async function fetchRequests() {
    if (!member) return;
    const requestsQuery = query(
      collection(db, "checkoutRequests"),
      where("requesterId", "==", member.displayId),
      where("status", "in", ["pending", "approved", "scheduled"])
    );
    const requestsSnap = await getDocs(requestsQuery);
    const reqs = requestsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as CheckoutRequest
    );
    setPendingRequests(reqs);

    const reqCovers: Record<string, string> = {};
    await Promise.all(
      reqs.map(async (r) => {
        const bookQ = query(
          collection(db, "books"),
          where("displayId", "==", r.bookId)
        );
        const bookSnap = await getDocs(bookQ);
        if (!bookSnap.empty) {
          const bookData = bookSnap.docs[0].data();
          if (bookData.coverUrl) reqCovers[r.bookId] = bookData.coverUrl;
        }
      })
    );
    setRequestCoverMap(reqCovers);
  }

  useEffect(() => {
    if (!member) return;
    async function fetch() {
      const q = query(
        collection(db, "transactions"),
        where("borrowerId", "==", member!.displayId),
        where("isCheckedOut", "==", true)
      );
      const snap = await getDocs(q);
      const txns = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);
      setActiveCheckouts(txns);

      // Fetch cover URLs for each checked-out book
      const covers: Record<string, string> = {};
      await Promise.all(
        txns.map(async (tx) => {
          const bookQ = query(
            collection(db, "books"),
            where("displayId", "==", tx.bookId)
          );
          const bookSnap = await getDocs(bookQ);
          if (!bookSnap.empty) {
            const bookData = bookSnap.docs[0].data();
            if (bookData.coverUrl) covers[tx.bookId] = bookData.coverUrl;
          }
        })
      );
      setCoverMap(covers);

      // Fetch active holds for this member
      const holdsQuery = query(
        collection(db, "holds"),
        where("holderId", "==", member!.displayId),
        where("status", "==", "active")
      );
      const holdsSnap = await getDocs(holdsQuery);
      const holds = holdsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Hold);

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

      // Fetch cover URLs for held books
      const holdCovers: Record<string, string> = {};
      await Promise.all(
        validHolds.map(async (h) => {
          const bookQ = query(
            collection(db, "books"),
            where("displayId", "==", h.bookId)
          );
          const bookSnap = await getDocs(bookQ);
          if (!bookSnap.empty) {
            const bookData = bookSnap.docs[0].data();
            if (bookData.coverUrl) holdCovers[h.bookId] = bookData.coverUrl;
          }
        })
      );
      setHoldCoverMap(holdCovers);

      // Fetch pending/approved/scheduled checkout requests for this member
      const requestsQuery = query(
        collection(db, "checkoutRequests"),
        where("requesterId", "==", member!.displayId),
        where("status", "in", ["pending", "approved", "scheduled"])
      );
      const requestsSnap = await getDocs(requestsQuery);
      const reqs = requestsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as CheckoutRequest
      );
      setPendingRequests(reqs);

      // Fetch cover URLs for requested books
      const reqCovers: Record<string, string> = {};
      await Promise.all(
        reqs.map(async (r) => {
          const bookQ = query(
            collection(db, "books"),
            where("displayId", "==", r.bookId)
          );
          const bookSnap = await getDocs(bookQ);
          if (!bookSnap.empty) {
            const bookData = bookSnap.docs[0].data();
            if (bookData.coverUrl) reqCovers[r.bookId] = bookData.coverUrl;
          }
        })
      );
      setRequestCoverMap(reqCovers);

      setLoading(false);
    }
    fetch();
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

  if (!member || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome, {member.firstName}!
        </h1>
        <p className="text-muted-foreground">Your book exchange dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{member.credits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Books Out</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCheckouts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{member.totalDonations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Scan CTA */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <h3 className="font-semibold text-lg">Ready to borrow?</h3>
            <p className="text-sm text-muted-foreground">Scan the QR code inside any book</p>
          </div>
          <Button asChild size="lg">
            <Link href="/checkout/scan">
              <QrCode className="mr-2 h-5 w-5" />
              Scan to Check Out
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Active Holds */}
      {activeHolds.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Active Holds</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeHolds.map((hold) => (
              <Card key={hold.id} className="border-amber-300">
                <CardHeader className="pb-2">
                  <div className="flex gap-3">
                    {holdCoverMap[hold.bookId] ? (
                      <img
                        src={holdCoverMap[hold.bookId]}
                        alt={`Cover of ${hold.bookTitle}`}
                        className="h-16 w-auto rounded border object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded border border-dashed bg-muted">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{hold.bookTitle}</CardTitle>
                      <CardDescription>
                        Held: {formatDate(hold.holdDate)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimeRemaining(hold.expiresAt)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelHold(hold)}
                      disabled={cancellingHold === hold.id}
                    >
                      <X className="mr-1 h-3 w-3" />
                      {cancellingHold === hold.id ? "Cancelling..." : "Cancel Hold"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Active Requests</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                coverUrl={requestCoverMap[req.bookId]}
                memberName={`${member.lastName}, ${member.firstName}`}
                memberDocId={member.id}
                onCancelled={() =>
                  setPendingRequests((prev) =>
                    prev.filter((r) => r.id !== req.id)
                  )
                }
                onWindowSelected={() => fetchRequests()}
              />
            ))}
          </div>
        </div>
      )}

      {/* Current Checkouts */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Current Checkouts</h2>
        {activeCheckouts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No books checked out. Visit the catalog to find your next read!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeCheckouts.map((tx) => {
              const overdue = isOverdue(tx.dueDate);
              return (
                <Card key={tx.id} className={overdue ? "border-red-300" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex gap-3">
                      {coverMap[tx.bookId] ? (
                        <img
                          src={coverMap[tx.bookId]}
                          alt={`Cover of ${tx.bookTitle}`}
                          className="h-16 w-auto rounded border object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded border border-dashed bg-muted">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{tx.bookTitle}</CardTitle>
                        <CardDescription>
                          Checked out: {formatDate(tx.checkoutDate)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        Due: <span className={overdue ? "text-red-600 font-medium" : ""}>{formatDate(tx.dueDate)}</span>
                      </div>
                      {overdue && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* History link */}
      <div className="text-center">
        <Button variant="outline" asChild>
          <Link href="/my/checkouts">View Full History</Link>
        </Button>
      </div>
    </div>
  );
}
