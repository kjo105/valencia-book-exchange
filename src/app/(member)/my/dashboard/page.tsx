"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Transaction } from "@/lib/validators";
import { formatDate, isOverdue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, BookOpen, CreditCard, AlertTriangle } from "lucide-react";

export default function MemberDashboard() {
  const { member } = useAuth();
  const [activeCheckouts, setActiveCheckouts] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    async function fetch() {
      const q = query(
        collection(db, "transactions"),
        where("borrowerId", "==", member!.displayId),
        where("isCheckedOut", "==", true)
      );
      const snap = await getDocs(q);
      setActiveCheckouts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));
      setLoading(false);
    }
    fetch();
  }, [member]);

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
                    <CardTitle className="text-base">{tx.bookTitle}</CardTitle>
                    <CardDescription>
                      Checked out: {formatDate(tx.checkoutDate)}
                    </CardDescription>
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
