"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction } from "@/lib/validators";
import { formatDate, isOverdue } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<
    (Transaction & { docId: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const txQuery = query(
          collection(db, "transactions"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(txQuery);
        const data = snapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
        })) as (Transaction & { docId: string })[];
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Book Title</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Checkout Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Check-in Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => {
                const overdue = isOverdue(tx.dueDate) && tx.isCheckedOut;
                return (
                  <TableRow
                    key={tx.docId}
                    className={overdue ? "bg-red-50 dark:bg-red-950/20" : ""}
                  >
                    <TableCell className="font-mono text-sm">
                      {tx.displayId}
                    </TableCell>
                    <TableCell>{tx.bookTitle}</TableCell>
                    <TableCell>{tx.borrowerName}</TableCell>
                    <TableCell>{formatDate(tx.checkoutDate)}</TableCell>
                    <TableCell>{formatDate(tx.dueDate)}</TableCell>
                    <TableCell>
                      {tx.checkinDate ? formatDate(tx.checkinDate) : "-"}
                    </TableCell>
                    <TableCell>
                      {overdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : tx.isCheckedOut ? (
                        <Badge variant="default">Checked Out</Badge>
                      ) : (
                        <Badge variant="secondary">Returned</Badge>
                      )}
                    </TableCell>
                    <TableCell>{tx.conditionAtCheckout}</TableCell>
                    <TableCell>
                      {tx.isCheckedOut && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/checkin/${tx.docId}`}>
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Check In
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
