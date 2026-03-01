"use client";

import { useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { checkinBookAction } from "@/actions/checkout";
import { CONDITIONS } from "@/lib/constants";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RotateCcw } from "lucide-react";

interface TransactionRecord {
  id: string;
  bookId?: string;
  bookTitle?: string;
  borrowerId?: string;
  memberName?: string;
  conditionAtCheckout?: string;
  [key: string]: any;
}

interface QuickCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionRecord | null;
  onSuccess: () => void;
}

export function QuickCheckinDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: QuickCheckinDialogProps) {
  const [conditionAtCheckin, setConditionAtCheckin] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setConditionAtCheckin("");
      setNotes("");
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
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
        transactionDocId: transaction.id,
        bookDocId,
        borrowerDocId: memberDocId,
        conditionAtCheckin,
        notes,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Book checked in successfully!");
        handleOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error("Error checking in book:", error);
      toast.error("Failed to check in book. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check In Book</DialogTitle>
          <DialogDescription>
            Return &quot;{transaction?.bookTitle || "N/A"}&quot; from{" "}
            {transaction?.memberName || "N/A"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkin-condition">Condition at Check-in</Label>
            <Select
              value={conditionAtCheckin}
              onValueChange={setConditionAtCheckin}
            >
              <SelectTrigger id="checkin-condition">
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
            <Label htmlFor="checkin-notes">Notes (optional)</Label>
            <Textarea
              id="checkin-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the condition or return..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {submitting ? "Processing..." : "Confirm Check-in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
