"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { collection, addDoc, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { GENRES, CONDITIONS, BOOK_STATUSES } from "@/lib/constants";

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  success: number;
  errors: string[];
}

export default function ImportPage() {
  const [bookRows, setBookRows] = useState<ParsedRow[]>([]);
  const [memberRows, setMemberRows] = useState<ParsedRow[]>([]);
  const [bookHeaders, setBookHeaders] = useState<string[]>([]);
  const [memberHeaders, setMemberHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "books" | "members"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as ParsedRow[];
        const headers = results.meta.fields || [];
        if (type === "books") {
          setBookRows(data);
          setBookHeaders(headers);
        } else {
          setMemberRows(data);
          setMemberHeaders(headers);
        }
        toast.success(`Parsed ${data.length} rows from ${file.name}`);
      },
      error: (err) => {
        toast.error(`Parse error: ${err.message}`);
      },
    });
  }

  function parseAuthorField(author: string): { last: string; first: string } {
    if (!author) return { last: "", first: "" };
    const parts = author.split(",").map((s) => s.trim());
    return { last: parts[0] || "", first: parts[1] || "" };
  }

  function findColumn(headers: string[], candidates: string[]): string | null {
    for (const c of candidates) {
      const found = headers.find(
        (h) => h.toLowerCase().replace(/[_\s]/g, "") === c.toLowerCase().replace(/[_\s]/g, "")
      );
      if (found) return found;
    }
    return null;
  }

  async function importBooks() {
    setImporting(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;

    try {
      const settingsRef = doc(db, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      let nextId = settingsSnap.exists() ? (settingsSnap.data().nextBookId || 1) : 1;

      const titleCol = findColumn(bookHeaders, ["title", "booktitle", "book_title", "Title"]);
      const authorCol = findColumn(bookHeaders, ["author", "authorname", "author_name", "Author"]);
      const authorLastCol = findColumn(bookHeaders, ["authorlast", "author_last", "lastname", "AuthorLast"]);
      const authorFirstCol = findColumn(bookHeaders, ["authorfirst", "author_first", "firstname", "AuthorFirst"]);
      const genreCol = findColumn(bookHeaders, ["genre", "category", "Genre"]);
      const conditionCol = findColumn(bookHeaders, ["condition", "Condition"]);
      const statusCol = findColumn(bookHeaders, ["status", "Status"]);
      const donorCol = findColumn(bookHeaders, ["donor", "donorname", "donor_name", "Donor", "DonorName"]);
      const notesCol = findColumn(bookHeaders, ["notes", "Notes", "comment", "comments"]);
      const yaCol = findColumn(bookHeaders, ["ya", "isya", "is_ya", "youngadult", "YA"]);

      for (let i = 0; i < bookRows.length; i++) {
        const row = bookRows[i];
        try {
          const title = titleCol ? row[titleCol]?.trim() : "";
          if (!title) {
            errors.push(`Row ${i + 1}: Missing title`);
            continue;
          }

          let authorLast = "";
          let authorFirst = "";
          if (authorLastCol) {
            authorLast = row[authorLastCol]?.trim() || "";
            authorFirst = authorFirstCol ? row[authorFirstCol]?.trim() || "" : "";
          } else if (authorCol) {
            const parsed = parseAuthorField(row[authorCol] || "");
            authorLast = parsed.last;
            authorFirst = parsed.first;
          }

          const rawGenre = genreCol ? row[genreCol]?.trim() : "";
          const genre = GENRES.includes(rawGenre as typeof GENRES[number]) ? rawGenre : "Other";

          const rawCondition = conditionCol ? row[conditionCol]?.trim() : "";
          const condition = CONDITIONS.includes(rawCondition as typeof CONDITIONS[number]) ? rawCondition : "Good";

          const rawStatus = statusCol ? row[statusCol]?.trim() : "";
          const status = BOOK_STATUSES.includes(rawStatus as typeof BOOK_STATUSES[number]) ? rawStatus : "Available";

          const donorName = donorCol ? row[donorCol]?.trim() || null : null;
          const notes = notesCol ? row[notesCol]?.trim() || "" : "";
          const isYA = yaCol ? ["true", "yes", "1", "y"].includes(row[yaCol]?.toLowerCase()?.trim() || "") : false;

          const displayId = `BID-${String(nextId).padStart(4, "0")}`;

          await addDoc(collection(db, "books"), {
            displayId,
            title,
            authorLast,
            authorFirst,
            author2Last: null,
            author2First: null,
            genre,
            isYA,
            condition,
            status,
            timesCheckedOut: 0,
            donorId: null,
            donorName,
            donationDate: Timestamp.now(),
            notes,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          nextId++;
          success++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      await updateDoc(settingsRef, { nextBookId: nextId });
    } catch (err) {
      errors.push(`Fatal: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    setResult({ success, errors });
    setImporting(false);
    if (success > 0) toast.success(`Imported ${success} books`);
    if (errors.length > 0) toast.error(`${errors.length} errors during import`);
  }

  async function importMembers() {
    setImporting(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;

    try {
      const settingsRef = doc(db, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);
      let nextId = settingsSnap.exists() ? (settingsSnap.data().nextMemberId || 1) : 1;

      const lastNameCol = findColumn(memberHeaders, ["lastname", "last_name", "last", "LastName"]);
      const firstNameCol = findColumn(memberHeaders, ["firstname", "first_name", "first", "FirstName"]);
      const phoneCol = findColumn(memberHeaders, ["phone", "telephone", "Phone"]);
      const emailCol = findColumn(memberHeaders, ["email", "Email", "e-mail"]);
      const roleCol = findColumn(memberHeaders, ["role", "Role"]);
      const notesCol = findColumn(memberHeaders, ["notes", "Notes"]);

      for (let i = 0; i < memberRows.length; i++) {
        const row = memberRows[i];
        try {
          const lastName = lastNameCol ? row[lastNameCol]?.trim() : "";
          const firstName = firstNameCol ? row[firstNameCol]?.trim() : "";
          if (!lastName || !firstName) {
            errors.push(`Row ${i + 1}: Missing name`);
            continue;
          }

          const displayId = `MID-${String(nextId).padStart(4, "0")}`;

          await addDoc(collection(db, "members"), {
            displayId,
            lastName,
            firstName,
            phone: phoneCol ? row[phoneCol]?.trim() || "" : "",
            email: emailCol ? row[emailCol]?.trim() || "" : "",
            firebaseUid: null,
            role: roleCol && row[roleCol]?.trim() === "admin" ? "admin" : "member",
            credits: 0,
            totalDonations: 0,
            booksCheckedOut: 0,
            isActive: true,
            notes: notesCol ? row[notesCol]?.trim() || "" : "",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });

          nextId++;
          success++;
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      await updateDoc(settingsRef, { nextMemberId: nextId });
    } catch (err) {
      errors.push(`Fatal: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    setResult({ success, errors });
    setImporting(false);
    if (success > 0) toast.success(`Imported ${success} members`);
    if (errors.length > 0) toast.error(`${errors.length} errors during import`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-muted-foreground">Import books and members from CSV files</p>
      </div>

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Import Books</TabsTrigger>
          <TabsTrigger value="members">Import Members</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Book CSV Import
              </CardTitle>
              <CardDescription>
                Upload a CSV with columns like: Title, Author (Last, First), Genre, Condition, Status, Donor, Notes.
                The importer will auto-detect column names.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "books")}
                />
              </label>

              {bookRows.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{bookRows.length} rows parsed</Badge>
                    <Badge variant="outline">Columns: {bookHeaders.join(", ")}</Badge>
                  </div>

                  <div className="max-h-64 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {bookHeaders.slice(0, 6).map((h) => (
                            <TableHead key={h}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookRows.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {bookHeaders.slice(0, 6).map((h) => (
                              <TableCell key={h} className="max-w-[200px] truncate">
                                {row[h]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {bookRows.length > 10 && (
                    <p className="text-sm text-muted-foreground">Showing first 10 of {bookRows.length} rows</p>
                  )}

                  <Button onClick={importBooks} disabled={importing}>
                    {importing ? "Importing..." : `Import ${bookRows.length} Books`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Member CSV Import
              </CardTitle>
              <CardDescription>
                Upload a CSV with columns: LastName, FirstName, Phone, Email, Role, Notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "members")}
                />
              </label>

              {memberRows.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{memberRows.length} rows parsed</Badge>
                    <Badge variant="outline">Columns: {memberHeaders.join(", ")}</Badge>
                  </div>

                  <div className="max-h-64 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {memberHeaders.map((h) => (
                            <TableHead key={h}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberRows.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            {memberHeaders.map((h) => (
                              <TableCell key={h}>{row[h]}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button onClick={importMembers} disabled={importing}>
                    {importing ? "Importing..." : `Import ${memberRows.length} Members`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              {result.success} records imported successfully
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {result.errors.length} errors
                </div>
                <div className="max-h-40 overflow-auto text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {result.errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
