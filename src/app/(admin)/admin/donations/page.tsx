"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatEuro, euroToCents, formatDate } from "@/lib/utils";
import { DONATION_PURPOSES } from "@/lib/constants";
import { MonetaryDonation } from "@/lib/validators";
import {
  createMonetaryDonationAction,
  deleteMonetaryDonationAction,
} from "@/actions/donations";

export default function DonationsPage() {
  const [donations, setDonations] = useState<(MonetaryDonation & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [donorName, setDonorName] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [donationDate, setDonationDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const fetchDonations = async () => {
    try {
      const q = query(
        collection(db, "monetaryDonations"),
        orderBy("donationDate", "desc")
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (MonetaryDonation & { id: string })[];
      setDonations(results);
    } catch (error) {
      console.error("Error fetching donations:", error);
      toast.error("Failed to load donations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const resetForm = () => {
    setDonorName("");
    setAmountInput("");
    setCurrency("EUR");
    setDonationDate("");
    setPurpose("");
    setNotes("");
  };

  const handleAddDonation = async () => {
    if (!donorName || !amountInput || !donationDate || !purpose) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountCents = euroToCents(amountInput);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      await createMonetaryDonationAction({
        donorId: null,
        donorName,
        amountCents,
        currency,
        donationDate,
        purpose,
        notes,
      });
      toast.success("Donation added successfully");
      resetForm();
      setDialogOpen(false);
      await fetchDonations();
    } catch (error) {
      console.error("Error adding donation:", error);
      toast.error("Failed to add donation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMonetaryDonationAction(id);
      toast.success("Donation deleted successfully");
      await fetchDonations();
    } catch (error) {
      console.error("Error deleting donation:", error);
      toast.error("Failed to delete donation");
    }
  };

  const totalCents = donations.reduce((sum, d) => sum + (d.amountCents || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading donations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monetary Donations</h1>
          <p className="text-muted-foreground">
            Track and manage monetary donations received.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Donation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Donation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="donorName">Donor Name</Label>
                <Input
                  id="donorName"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Enter donor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (EUR)</Label>
                <Input
                  id="amount"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="20.00"
                  type="text"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donationDate">Donation Date</Label>
                <Input
                  id="donationDate"
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {DONATION_PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
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
                  placeholder="Optional notes"
                />
              </div>
              <Button
                onClick={handleAddDonation}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Adding..." : "Add Donation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No donations found.
                  </TableCell>
                </TableRow>
              ) : (
                donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell className="font-medium">{donation.donorName}</TableCell>
                    <TableCell>{formatEuro(donation.amountCents)}</TableCell>
                    <TableCell>
                      {donation.purpose
                        ? donation.purpose.charAt(0).toUpperCase() +
                          donation.purpose.slice(1)
                        : ""}
                    </TableCell>
                    <TableCell>
                      {donation.donationDate
                        ? formatDate(
                            donation.donationDate instanceof Timestamp
                              ? donation.donationDate.toDate()
                              : new Date(donation.donationDate)
                          )
                        : ""}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {donation.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(donation.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <span className="text-lg font-semibold">Total Donations</span>
          <span className="text-2xl font-bold">{formatEuro(totalCents)}</span>
        </CardContent>
      </Card>
    </div>
  );
}
