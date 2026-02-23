"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Printer, QrCode } from "lucide-react";
import { Book } from "@/lib/validators";
import QRCode from "react-qr-code";

export default function QRCodePage() {
  const [books, setBooks] = useState<(Book & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const q = query(collection(db, "books"), orderBy("displayId", "asc"));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (Book & { id: string })[];
        setBooks(results);
      } catch (error) {
        console.error("Error fetching books:", error);
        toast.error("Failed to load books");
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const selectedBook = books.find((b) => b.id === selectedBookId);

  const filteredBooks = filterText
    ? books.filter(
        (b) =>
          (b.displayId &&
            b.displayId.toLowerCase().includes(filterText.toLowerCase())) ||
          (b.title &&
            b.title.toLowerCase().includes(filterText.toLowerCase()))
      )
    : books;

  const getQrUrl = (book: Book) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/checkout/${book.displayId}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading books...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">QR Code Generator</h1>
        <p className="text-muted-foreground">
          Generate QR codes for books to enable easy checkout.
        </p>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">
            <QrCode className="mr-2 h-4 w-4" />
            Single QR
          </TabsTrigger>
          <TabsTrigger value="sheet">
            <Printer className="mr-2 h-4 w-4" />
            Print Sheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Single QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select a Book</Label>
                <Select
                  value={selectedBookId}
                  onValueChange={setSelectedBookId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a book..." />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.displayId} - {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBook && (
                <div className="flex flex-col items-center space-y-4 pt-4">
                  <div className="bg-white p-6 rounded-lg border">
                    <QRCode value={getQrUrl(selectedBook)} size={256} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{selectedBook.displayId}</p>
                    <p className="text-muted-foreground">{selectedBook.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getQrUrl(selectedBook)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sheet" className="space-y-4">
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Print QR Code Sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="filter">Filter Books (optional)</Label>
                <Input
                  id="filter"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter by ID or title..."
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Showing {filteredBooks.length} of {books.length} books.
              </p>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print QR Codes
              </Button>
            </CardContent>
          </Card>

          <div className="qr-print-sheet grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="flex flex-col items-center p-3 border rounded-lg bg-white print:border print:rounded-none print:p-2"
              >
                <QRCode value={getQrUrl(book)} size={128} />
                <p className="mt-2 font-bold text-sm text-center">
                  {book.displayId}
                </p>
                <p className="text-xs text-muted-foreground text-center truncate max-w-[140px]">
                  {book.title}
                </p>
              </div>
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No books match the current filter.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .qr-print-sheet,
          .qr-print-sheet * {
            visibility: visible;
          }
          .qr-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
