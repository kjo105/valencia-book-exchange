"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QrCode, Keyboard, Search, AlertCircle, BookOpen } from "lucide-react";

export default function AdminCheckinScanPage() {
  const router = useRouter();
  const [manualId, setManualId] = useState("");
  const [showScanner, setShowScanner] = useState(true);
  const [scanError, setScanError] = useState("");
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState("");

  async function lookupBook(displayId: string) {
    setLooking(true);
    setNotFound("");
    setScanError("");

    try {
      // Find the book by displayId
      const bookQuery = query(
        collection(db, "books"),
        where("displayId", "==", displayId)
      );
      const bookSnap = await getDocs(bookQuery);

      if (bookSnap.empty) {
        setNotFound(`No book found with ID "${displayId}".`);
        setLooking(false);
        return;
      }

      // Find active transaction for this book
      const txnQuery = query(
        collection(db, "transactions"),
        where("bookId", "==", displayId),
        where("isCheckedOut", "==", true)
      );
      const txnSnap = await getDocs(txnQuery);

      if (txnSnap.empty) {
        setNotFound("This book is not currently checked out.");
        setLooking(false);
        return;
      }

      // Redirect to the checkin page for this transaction
      const transDocId = txnSnap.docs[0].id;
      router.push(`/admin/checkin/${transDocId}`);
    } catch {
      setNotFound("Failed to look up book. Please try again.");
      setLooking(false);
    }
  }

  function handleScan(results: { rawValue: string }[]) {
    if (!results || results.length === 0 || looking) return;
    const raw = results[0].rawValue;

    let bookId = raw;
    const urlMatch = raw.match(/\/checkout\/(BID-\d{4})/);
    if (urlMatch) {
      bookId = urlMatch[1];
    } else if (!raw.match(/^BID-\d{4}$/)) {
      const bidMatch = raw.match(/BID-\d{4}/);
      if (bidMatch) {
        bookId = bidMatch[0];
      } else {
        setScanError("Invalid QR code. Expected a book ID (BID-XXXX).");
        return;
      }
    }

    lookupBook(bookId);
  }

  function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = manualId.trim().toUpperCase();
    if (!id) return;

    let displayId = id;
    if (/^\d{1,4}$/.test(id)) {
      displayId = `BID-${id.padStart(4, "0")}`;
    } else if (!id.startsWith("BID-")) {
      displayId = `BID-${id}`;
    }

    lookupBook(displayId);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Scan to Check In</h1>
        <p className="text-muted-foreground mt-1">
          Scan or enter the book&apos;s ID to find its active checkout
        </p>
      </div>

      {showScanner && (
        <Card>
          <CardContent className="p-4">
            <div className="aspect-square max-h-[400px] overflow-hidden rounded-lg">
              <Scanner
                onScan={handleScan}
                onError={(error) => setScanError(String(error))}
                formats={["qr_code"]}
                components={{ audio: false } as Record<string, unknown>}
              />
            </div>
            {scanError && (
              <p className="text-sm text-red-600 mt-2 text-center">
                {scanError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowScanner(!showScanner)}
          className="gap-2"
        >
          {showScanner ? (
            <>
              <Keyboard className="h-4 w-4" />
              Enter ID Manually
            </>
          ) : (
            <>
              <QrCode className="h-4 w-4" />
              Use QR Scanner
            </>
          )}
        </Button>
      </div>

      {/* Manual entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manual Entry</CardTitle>
          <CardDescription>
            Type the Book ID printed below the QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualLookup} className="flex gap-2">
            <Input
              placeholder="BID-0001"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <Button type="submit" disabled={looking}>
              <Search className="mr-2 h-4 w-4" />
              {looking ? "Looking up..." : "Look Up"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status messages */}
      {looking && (
        <div className="flex items-center justify-center py-4">
          <BookOpen className="h-8 w-8 animate-pulse text-muted-foreground" />
        </div>
      )}

      {notFound && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">{notFound}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
