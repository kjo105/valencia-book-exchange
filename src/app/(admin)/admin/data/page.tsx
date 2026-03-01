"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportTabContent } from "@/components/admin/import-tab-content";
import { ExportTabContent } from "@/components/admin/export-tab-content";

export default function DataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Management</h1>
        <p className="text-muted-foreground">Import and export your library data</p>
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <ImportTabContent />
        </TabsContent>

        <TabsContent value="export">
          <ExportTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
