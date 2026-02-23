"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Book } from "@/lib/validators";
import { formatAuthor, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function BookDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [book, setBook] = useState<(Book & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBook() {
      try {
        const docRef = doc(db, "books", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBook({ id: docSnap.id, ...docSnap.data() } as Book & { id: string });
        }
      } catch (error) {
        console.error("Error fetching book:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchBook();
    }
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-100 text-green-800 border-green-300";
      case "Checked Out":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg text-muted-foreground mb-4">Book not found.</p>
          <Link href="/catalog">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/catalog">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Catalog
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex gap-6">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                className="h-48 w-auto rounded border object-cover shrink-0"
              />
            ) : (
              <div className="flex h-48 w-32 shrink-0 items-center justify-center rounded border border-dashed bg-muted">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl">{book.title}</CardTitle>
              <p className="text-lg text-muted-foreground mt-1">
                {formatAuthor(book.authorLast, book.authorFirst)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{book.genre}</Badge>
            <Badge variant="secondary">{book.condition}</Badge>
            <Badge className={getStatusColor(book.status)}>{book.status}</Badge>
            {book.isYA && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                Young Adult
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Author (Last)</p>
              <p>{book.authorLast}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Author (First)</p>
              <p>{book.authorFirst}</p>
            </div>
            {book.author2Last && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Second Author (Last)</p>
                <p>{book.author2Last}</p>
              </div>
            )}
            {book.author2First && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Second Author (First)</p>
                <p>{book.author2First}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Genre</p>
              <p>{book.genre}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Condition</p>
              <p>{book.condition}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p>{book.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Young Adult</p>
              <p>{book.isYA ? "Yes" : "No"}</p>
            </div>
            {book.donationDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Donation Date</p>
                <p>{formatDate(book.donationDate)}</p>
              </div>
            )}
          </div>

          {book.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{book.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
