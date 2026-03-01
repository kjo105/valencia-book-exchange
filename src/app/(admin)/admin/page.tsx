"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isOverdue, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, AlertTriangle, ArrowRightLeft, Library, Inbox, CalendarCheck } from "lucide-react";

interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  checkedOutBooks: number;
  totalMembers: number;
  overdueCount: number;
  pendingRequests: number;
}

interface CalendarEventRecord {
  id: string;
  bookTitle?: string;
  memberName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  [key: string]: any;
}

interface TransactionRecord {
  id: string;
  bookTitle?: string;
  memberName?: string;
  checkoutDate?: any;
  dueDate?: any;
  returnDate?: any;
  isCheckedOut?: boolean;
  createdAt?: any;
  [key: string]: any;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    availableBooks: 0,
    checkedOutBooks: 0,
    totalMembers: 0,
    overdueCount: 0,
    pendingRequests: 0,
  });
  const [overdueTransactions, setOverdueTransactions] = useState<TransactionRecord[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);
  const [upcomingPickups, setUpcomingPickups] = useState<CalendarEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch books
        const booksSnapshot = await getDocs(collection(db, "books"));
        const totalBooks = booksSnapshot.size;
        let availableBooks = 0;
        let checkedOutBooks = 0;
        booksSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status === "Available") availableBooks++;
          if (data.status === "Checked Out") checkedOutBooks++;
        });

        // Fetch members
        const membersSnapshot = await getDocs(collection(db, "members"));
        const totalMembers = membersSnapshot.size;

        // Fetch active transactions to find overdue
        const activeTransactionsQuery = query(
          collection(db, "transactions"),
          where("isCheckedOut", "==", true)
        );
        const activeSnapshot = await getDocs(activeTransactionsQuery);
        const overdue: TransactionRecord[] = [];
        activeSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.dueDate && isOverdue(data.dueDate)) {
            overdue.push({ id: doc.id, ...data });
          }
        });

        // Fetch pending checkout requests
        const pendingRequestsQuery = query(
          collection(db, "checkoutRequests"),
          where("status", "==", "pending")
        );
        const pendingRequestsSnapshot = await getDocs(pendingRequestsQuery);

        // Fetch recent transactions
        const recentQuery = query(
          collection(db, "transactions"),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const recentSnapshot = await getDocs(recentQuery);
        const recent = recentSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TransactionRecord[];

        // Fetch upcoming calendar events (pickups)
        const eventsQuery = query(
          collection(db, "calendarEvents"),
          orderBy("date", "asc"),
          limit(5)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const events = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CalendarEventRecord[];
        setUpcomingPickups(events);

        setStats({
          totalBooks,
          availableBooks,
          checkedOutBooks,
          totalMembers,
          overdueCount: overdue.length,
          pendingRequests: pendingRequestsSnapshot.size,
        });
        setOverdueTransactions(overdue);
        setRecentTransactions(recent);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Library className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.availableBooks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Checked Out</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.checkedOutBooks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Inbox className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingRequests}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Pickups */}
      {upcomingPickups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-green-600" />
            Upcoming Pickups
          </h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Member</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingPickups.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.date || "—"}</TableCell>
                      <TableCell>
                        {event.startTime && event.endTime
                          ? `${event.startTime}–${event.endTime}`
                          : "—"}
                      </TableCell>
                      <TableCell>{event.bookTitle || "N/A"}</TableCell>
                      <TableCell>{event.memberName || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue Books Table */}
      {overdueTransactions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Overdue Books
          </h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Checkout Date</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.bookTitle || "N/A"}</TableCell>
                      <TableCell>{tx.memberName || "N/A"}</TableCell>
                      <TableCell>{tx.checkoutDate ? formatDate(tx.checkoutDate) : "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {tx.dueDate ? formatDate(tx.dueDate) : "N/A"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transactions Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.bookTitle || "N/A"}</TableCell>
                      <TableCell>{tx.memberName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={tx.isCheckedOut ? "default" : "secondary"}>
                          {tx.isCheckedOut ? "Checkout" : "Return"}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.createdAt ? formatDate(tx.createdAt) : "N/A"}</TableCell>
                      <TableCell>{tx.dueDate ? formatDate(tx.dueDate) : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
