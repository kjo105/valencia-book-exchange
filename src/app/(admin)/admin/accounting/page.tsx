"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountingSummary } from "@/components/admin/accounting-summary";
import { DonationsTabContent } from "@/components/admin/donations-tab-content";
import { ExpensesTabContent } from "@/components/admin/expenses-tab-content";

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">
          Overview of donations, expenses, and net balance.
        </p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <AccountingSummary />
        </TabsContent>

        <TabsContent value="donations">
          <DonationsTabContent />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
