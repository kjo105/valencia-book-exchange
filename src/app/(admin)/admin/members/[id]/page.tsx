"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Member, Transaction } from "@/lib/validators";
import { updateMemberAction } from "@/actions/members";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Save, BookOpen } from "lucide-react";
import Link from "next/link";

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [transactions, setTransactions] = useState<
    (Transaction & { docId: string })[]
  >([]);
  const [donatedBooksCount, setDonatedBooksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    email: "",
    role: "member" as "member" | "admin",
    isActive: true,
    notes: "",
    credits: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const memberRef = doc(db, "members", id);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) {
          toast.error("Member not found.");
          router.push("/admin/members");
          return;
        }

        const memberData = memberSnap.data() as Member;
        setMember(memberData);
        setForm({
          lastName: memberData.lastName ?? "",
          firstName: memberData.firstName ?? "",
          phone: memberData.phone ?? "",
          email: memberData.email ?? "",
          role: memberData.role ?? "member",
          isActive: memberData.isActive ?? true,
          notes: memberData.notes ?? "",
          credits: memberData.credits ?? 0,
        });

        // Fetch transactions for this member
        const txQuery = query(
          collection(db, "transactions"),
          where("borrowerId", "==", memberData.displayId),
          orderBy("createdAt", "desc")
        );
        const txSnap = await getDocs(txQuery);
        const txData = txSnap.docs.map((d) => ({
          docId: d.id,
          ...d.data(),
        })) as (Transaction & { docId: string })[];
        setTransactions(txData);

        // Fetch donated books count
        const booksQuery = query(
          collection(db, "books"),
          where("donorId", "==", memberData.displayId)
        );
        const booksSnap = await getDocs(booksQuery);
        setDonatedBooksCount(booksSnap.size);
      } catch (error) {
        console.error("Error fetching member:", error);
        toast.error("Failed to load member data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "credits" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await updateMemberAction(id, form);
      toast.success("Member updated successfully!");
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading member...</p>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {member.lastName}, {member.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">{member.displayId}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
            <CardDescription>Update member information below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value: "member" | "admin") =>
                    setForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  name="credits"
                  type="number"
                  value={form.credits}
                  onChange={handleChange}
                  min={0}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: checked === true,
                    }))
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={submitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={member.isActive ? "default" : "destructive"}>
                {member.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Credits</span>
              <span className="font-medium">{member.credits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Books Checked Out
              </span>
              <span className="font-medium">{member.booksCheckedOut}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Books Donated
              </span>
              <span className="font-medium flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {donatedBooksCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All checkouts and check-ins for this member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Checkout Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Check-in Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.docId}>
                      <TableCell className="font-mono text-sm">
                        {tx.displayId}
                      </TableCell>
                      <TableCell>{tx.bookTitle}</TableCell>
                      <TableCell>{formatDate(tx.checkoutDate)}</TableCell>
                      <TableCell>{formatDate(tx.dueDate)}</TableCell>
                      <TableCell>
                        {tx.checkinDate ? formatDate(tx.checkinDate) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tx.isCheckedOut ? "default" : "secondary"}
                        >
                          {tx.isCheckedOut ? "Checked Out" : "Returned"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
