"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Transaction } from "@/lib/validators";
import { checkinBookAction } from "@/actions/checkout";
import { formatDate } from "@/lib/utils";
import { CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function CheckinPage() {
  const { transId } = useParams<{ transId: string }>();
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conditionAtCheckin, setConditionAtCheckin] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchTransaction() {
      try {
        const txRef = doc(db, "transactions", transId);
        const txSnap = await getDoc(txRef);

        if (!txSnap.exists()) {
          toast.error("Transaction not found.");
          router.push("/admin/transactions");
          return;
        }

        const txData = txSnap.data() as Transaction;
        setTransaction(txData);
        setConditionAtCheckin(txData.conditionAtCheckout ?? "");
      } catch (error) {
        console.error("Error fetching transaction:", error);
        toast.error("Failed to load transaction.");
      } finally {
        setLoading(false);
      }
    }
    fetchTransaction();
  }, [transId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction) return;
    if (!conditionAtCheckin) {
      toast.error("Please select the condition at check-in.");
      return;
    }

    setSubmitting(true);

    try {
      // Find book doc ID by displayId
      const bookQuery = query(
        collection(db, "books"),
        where("displayId", "==", transaction.bookId)
      );
      const bookSnap = await getDocs(bookQuery);
      if (bookSnap.empty) {
        toast.error("Book not found.");
        setSubmitting(false);
        return;
      }
      const bookDocId = bookSnap.docs[0].id;

      // Find member doc ID by displayId
      const memberQuery = query(
        collection(db, "members"),
        where("displayId", "==", transaction.borrowerId)
      );
      const memberSnap = await getDocs(memberQuery);
      if (memberSnap.empty) {
        toast.error("Member not found.");
        setSubmitting(false);
        return;
      }
      const memberDocId = memberSnap.docs[0].id;

      const result = await checkinBookAction({
        transactionDocId: transId,
        bookDocId,
        borrowerDocId: memberDocId,
        conditionAtCheckin,
        notes,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Book checked in successfully!");
        router.push("/admin/transactions");
      }
    } catch (error) {
      console.error("Error checking in book:", error);
      toast.error("Failed to check in book. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading transaction...</p>
      </div>
    );
  }

  if (!transaction) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/transactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Check In Book</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Review the details and confirm the check-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Book Title</p>
              <p className="font-medium">{transaction.bookTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Borrower</p>
              <p className="font-medium">{transaction.borrowerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Checkout Date</p>
              <p className="font-medium">
                {formatDate(transaction.checkoutDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">{formatDate(transaction.dueDate)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conditionAtCheckin">Condition at Check-in</Label>
              <Select
                value={conditionAtCheckin}
                onValueChange={setConditionAtCheckin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about the condition or return..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {submitting ? "Processing..." : "Confirm Check-in"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/transactions">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
