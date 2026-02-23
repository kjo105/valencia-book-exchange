"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Keyboard } from "lucide-react";

export default function ScanPage() {
  const router = useRouter();
  const [manualId, setManualId] = useState("");
  const [showScanner, setShowScanner] = useState(true);
  const [scanError, setScanError] = useState("");

  function handleScan(results: { rawValue: string }[]) {
    if (!results || results.length === 0) return;
    const raw = results[0].rawValue;

    // Extract book ID from URL or raw text
    // URL format: https://domain.com/checkout/BID-0001
    // Or just: BID-0001
    let bookId = raw;
    const urlMatch = raw.match(/\/checkout\/(BID-\d{4})/);
    if (urlMatch) {
      bookId = urlMatch[1];
    } else if (!raw.match(/^BID-\d{4}$/)) {
      // Try to find BID pattern anywhere in the string
      const bidMatch = raw.match(/BID-\d{4}/);
      if (bidMatch) {
        bookId = bidMatch[0];
      } else {
        setScanError("Invalid QR code. Expected a book ID (BID-XXXX).");
        return;
      }
    }

    router.push(`/checkout/${bookId}`);
  }

  function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = manualId.trim().toUpperCase();
    if (!id) return;

    // Normalize: if user types just a number, prefix it
    let bookId = id;
    if (/^\d{1,4}$/.test(id)) {
      bookId = `BID-${id.padStart(4, "0")}`;
    } else if (!id.startsWith("BID-")) {
      bookId = `BID-${id}`;
    }

    router.push(`/checkout/${bookId}`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Scan to Check Out</h1>
        <p className="text-muted-foreground mt-1">Scan the QR code inside the book cover</p>
      </div>

      {showScanner ? (
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
              <p className="text-sm text-red-600 mt-2 text-center">{scanError}</p>
            )}
          </CardContent>
        </Card>
      ) : null}

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
            <Button type="submit">Look Up</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
