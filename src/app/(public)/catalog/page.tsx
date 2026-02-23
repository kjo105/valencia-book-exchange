"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Book } from "@/lib/validators";
import { formatAuthor } from "@/lib/utils";
import { GENRES, BOOK_STATUSES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, BookOpen } from "lucide-react";

export default function CatalogPage() {
  const [books, setBooks] = useState<(Book & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("Available");

  useEffect(() => {
    async function fetchBooks() {
      try {
        const booksRef = collection(db, "books");
        let q;
        if (statusFilter && statusFilter !== "all") {
          q = query(
            booksRef,
            where("status", "==", statusFilter),
            orderBy("title", "asc")
          );
        } else {
          q = query(booksRef, orderBy("title", "asc"));
        }
        const snapshot = await getDocs(q);
        const fetchedBooks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (Book & { id: string })[];
        setBooks(fetchedBooks);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBooks();
  }, [statusFilter]);

  const filteredBooks = books.filter((book) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      book.title.toLowerCase().includes(search) ||
      book.authorLast.toLowerCase().includes(search) ||
      book.authorFirst.toLowerCase().includes(search);

    const matchesGenre =
      !genreFilter || genreFilter === "all" || book.genre === genreFilter;

    return matchesSearch && matchesGenre;
  });

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
          <p className="text-muted-foreground">Loading catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Book Catalog</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {GENRES.map((genre) => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {BOOK_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">No books found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <Link key={book.id} href={`/catalog/${book.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
                <div className="flex h-full">
                  <div className="w-20 shrink-0 bg-muted flex items-center justify-center">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={`Cover of ${book.title}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatAuthor(book.authorLast, book.authorFirst)}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{book.genre}</Badge>
                        <Badge variant="secondary">{book.condition}</Badge>
                        <Badge className={getStatusColor(book.status)}>
                          {book.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-6">
        Showing {filteredBooks.length} of {books.length} books
      </p>
    </div>
  );
}
