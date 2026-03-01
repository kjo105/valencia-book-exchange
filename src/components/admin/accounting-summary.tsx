"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";
import { MonetaryDonation, Expense } from "@/lib/validators";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

export function AccountingSummary() {
  const [donations, setDonations] = useState<(MonetaryDonation & { id: string })[]>([]);
  const [expenses, setExpenses] = useState<(Expense & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [donationsSnapshot, expensesSnapshot] = await Promise.all([
          getDocs(
            query(collection(db, "monetaryDonations"), orderBy("donationDate", "desc"))
          ),
          getDocs(
            query(collection(db, "expenses"), orderBy("expenseDate", "desc"))
          ),
        ]);

        setDonations(
          donationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as (MonetaryDonation & { id: string })[]
        );

        setExpenses(
          expensesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as (Expense & { id: string })[]
        );
      } catch (error) {
        console.error("Error fetching accounting data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalDonationsCents = donations.reduce(
    (sum, d) => sum + (d.amountCents || 0),
    0
  );
  const totalExpensesCents = expenses.reduce(
    (sum, e) => sum + (e.amountCents || 0),
    0
  );
  const netBalanceCents = totalDonationsCents - totalExpensesCents;

  const donationsByPurpose = donations.reduce<Record<string, number>>(
    (acc, d) => {
      const key = d.purpose || "general";
      acc[key] = (acc[key] || 0) + (d.amountCents || 0);
      return acc;
    },
    {}
  );

  const expensesByCategory = expenses.reduce<Record<string, number>>(
    (acc, e) => {
      const key = e.category || "other";
      acc[key] = (acc[key] || 0) + (e.amountCents || 0);
      return acc;
    },
    {}
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading accounting data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatEuro(totalDonationsCents)}
            </div>
            <p className="text-xs text-muted-foreground">
              {donations.length} donation{donations.length !== 1 ? "s" : ""} received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatEuro(totalExpensesCents)}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netBalanceCents >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatEuro(netBalanceCents)}
            </div>
            <p className="text-xs text-muted-foreground">
              Donations minus expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Donations by Purpose</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(donationsByPurpose).length === 0 ? (
              <p className="text-sm text-muted-foreground">No donations recorded.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(donationsByPurpose)
                  .sort(([, a], [, b]) => b - a)
                  .map(([purpose, amountCents]) => (
                    <div
                      key={purpose}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm font-medium">
                        {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatEuro(amountCents)}
                      </span>
                    </div>
                  ))}
                <div className="flex items-center justify-between pt-2 border-t-2">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatEuro(totalDonationsCents)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amountCents]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <span className="text-sm font-medium">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        {formatEuro(amountCents)}
                      </span>
                    </div>
                  ))}
                <div className="flex items-center justify-between pt-2 border-t-2">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-sm font-bold text-red-600">
                    {formatEuro(totalExpensesCents)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
