"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { Transaction } from "@/lib/validators";
import { formatDate, isOverdue } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CheckoutHistoryPage() {
  const { member } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    async function fetch() {
      const q = query(
        collection(db, "transactions"),
        where("borrowerId", "==", member!.displayId),
        orderBy("checkoutDate", "desc")
      );
      const snap = await getDocs(q);
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));
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
      <h1 className="text-3xl font-bold">My Checkout History</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Checked Out</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No checkout history yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const overdue = tx.isCheckedOut && isOverdue(tx.dueDate);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.bookTitle}</TableCell>
                      <TableCell>{formatDate(tx.checkoutDate)}</TableCell>
                      <TableCell className={overdue ? "text-red-600 font-medium" : ""}>
                        {formatDate(tx.dueDate)}
                      </TableCell>
                      <TableCell>
                        {tx.checkinDate ? formatDate(tx.checkinDate) : "—"}
                      </TableCell>
                      <TableCell>
                        {overdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : tx.isCheckedOut ? (
                          <Badge>Checked Out</Badge>
                        ) : (
                          <Badge variant="secondary">Returned</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
