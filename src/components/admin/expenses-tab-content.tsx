"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { formatEuro, euroToCents, formatDate } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { Expense } from "@/lib/validators";
import { createExpenseAction, deleteExpenseAction } from "@/actions/donations";

export function ExpensesTabContent() {
  const [expenses, setExpenses] = useState<(Expense & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [expenseDate, setExpenseDate] = useState("");
  const [category, setCategory] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  const fetchExpenses = async () => {
    try {
      const q = query(
        collection(db, "expenses"),
        orderBy("expenseDate", "desc")
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (Expense & { id: string })[];
      setExpenses(results);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const resetForm = () => {
    setDescription("");
    setAmountInput("");
    setCurrency("EUR");
    setExpenseDate("");
    setCategory("");
    setReceiptUrl("");
  };

  const handleAddExpense = async () => {
    if (!description || !amountInput || !expenseDate || !category) {
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
      await createExpenseAction({
        description,
        amountCents,
        currency,
        expenseDate,
        category,
        receiptUrl: receiptUrl || null,
      });
      toast.success("Expense added successfully");
      resetForm();
      setDialogOpen(false);
      await fetchExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpenseAction(id);
      toast.success("Expense deleted successfully");
      await fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const totalCents = expenses.reduce((sum, e) => sum + (e.amountCents || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Track and manage organizational expenses.
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter expense description"
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
                <Label htmlFor="expenseDate">Expense Date</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptUrl">Receipt URL (optional)</Label>
                <Input
                  id="receiptUrl"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button
                onClick={handleAddExpense}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? "Adding..." : "Add Expense"}
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
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No expenses found.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>{formatEuro(expense.amountCents)}</TableCell>
                    <TableCell>
                      {expense.category
                        ? expense.category.charAt(0).toUpperCase() +
                          expense.category.slice(1)
                        : ""}
                    </TableCell>
                    <TableCell>
                      {expense.expenseDate
                        ? formatDate(
                            expense.expenseDate instanceof Timestamp
                              ? expense.expenseDate.toDate()
                              : new Date(expense.expenseDate)
                          )
                        : ""}
                    </TableCell>
                    <TableCell>
                      {expense.receiptUrl ? (
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:underline"
                        >
                          View <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
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
          <span className="text-lg font-semibold">Total Expenses</span>
          <span className="text-2xl font-bold">{formatEuro(totalCents)}</span>
        </CardContent>
      </Card>
    </div>
  );
}
