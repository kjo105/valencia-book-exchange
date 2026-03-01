"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { CheckoutRequest, PickupWindow } from "@/lib/validators";
import {
  approveCheckoutRequestAction,
  completeCheckoutRequestAction,
  cancelCheckoutRequestAction,
} from "@/actions/checkout-requests";
import { formatDate } from "@/lib/utils";
import { PickupScheduleDialog } from "@/components/checkout-requests/pickup-schedule-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Inbox, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminCheckoutRequestsPage() {
  const { member } = useAuth();
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleRequest, setScheduleRequest] =
    useState<CheckoutRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const q = query(
        collection(db, "checkoutRequests"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const reqs = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as CheckoutRequest
      );
      setRequests(reqs);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(data: {
    pickupWindows: PickupWindow[];
    pickupNotes: string;
  }) {
    if (!scheduleRequest || !member) return;
    const result = await approveCheckoutRequestAction({
      requestId: scheduleRequest.id,
      reviewerId: member.displayId,
      pickupWindows: data.pickupWindows,
      pickupNotes: data.pickupNotes,
    });
    if (result.success) {
      toast.success("Request approved — pickup windows sent to member");
      fetchRequests();
    } else {
      toast.error(result.error || "Failed to approve request");
    }
  }

  async function handleComplete(requestId: string) {
    setActionLoading(requestId);
    try {
      const result = await completeCheckoutRequestAction({ requestId });
      if (result.success) {
        toast.success(`Pickup completed! Transaction ${result.transactionId} created.`);
        fetchRequests();
      } else {
        toast.error(result.error || "Failed to complete pickup");
      }
    } catch {
      toast.error("Failed to complete pickup");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(requestId: string) {
    if (!member) return;
    setActionLoading(requestId);
    try {
      const result = await cancelCheckoutRequestAction({
        requestId,
        cancelledBy: "admin",
        cancellerName: `${member.lastName}, ${member.firstName}`,
      });
      if (result.success) {
        toast.success("Request cancelled");
        fetchRequests();
      } else {
        toast.error(result.error || "Failed to cancel request");
      }
    } catch {
      toast.error("Failed to cancel request");
    } finally {
      setActionLoading(null);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const scheduledRequests = requests.filter((r) => r.status === "scheduled");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Inbox className="h-12 w-12 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Checkout Requests</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending{" "}
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved{" "}
            {approvedRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {approvedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled{" "}
            {scheduledRequests.length > 0 && (
              <Badge className="ml-2 bg-green-100 text-green-800">
                {scheduledRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No pending requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.bookTitle}
                          <div className="text-xs text-muted-foreground">
                            {req.bookId}
                          </div>
                        </TableCell>
                        <TableCell>
                          {req.requesterName}
                          <div className="text-xs text-muted-foreground">
                            {req.requesterId}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(req.requestedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => setScheduleRequest(req)}
                              disabled={actionLoading === req.id}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancel(req.id)}
                              disabled={actionLoading === req.id}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Deny
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved Tab — Awaiting member selection */}
        <TabsContent value="approved">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Windows Offered</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No approved requests awaiting member selection
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvedRequests.map((req) => {
                      const windows = req.pickupWindows || [];
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">
                            {req.bookTitle}
                            <div className="text-xs text-muted-foreground">
                              {req.bookId}
                            </div>
                          </TableCell>
                          <TableCell>
                            {req.requesterName}
                            <div className="text-xs text-muted-foreground">
                              {req.requesterId}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              {windows.map((w, i) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                  {w.date} ({w.startTime}–{w.endTime})
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Awaiting selection
                              </Badge>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancel(req.id)}
                                disabled={actionLoading === req.id}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Tab — Member selected, ready for pickup */}
        <TabsContent value="scheduled">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledRequests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        No scheduled pickups
                      </TableCell>
                    </TableRow>
                  ) : (
                    scheduledRequests.map((req) => {
                      const windows = req.pickupWindows || [];
                      const chosen =
                        req.selectedWindowIndex !== null &&
                        req.selectedWindowIndex !== undefined
                          ? windows[req.selectedWindowIndex]
                          : null;
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">
                            {req.bookTitle}
                            <div className="text-xs text-muted-foreground">
                              {req.bookId}
                            </div>
                          </TableCell>
                          <TableCell>
                            {req.requesterName}
                            <div className="text-xs text-muted-foreground">
                              {req.requesterId}
                            </div>
                          </TableCell>
                          <TableCell>{chosen?.date || "—"}</TableCell>
                          <TableCell>
                            {chosen
                              ? `${chosen.startTime}–${chosen.endTime}`
                              : "—"}
                            {req.pickupNotes && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {req.pickupNotes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleComplete(req.id)}
                                disabled={actionLoading === req.id}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                {actionLoading === req.id
                                  ? "Processing..."
                                  : "Complete Pickup"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancel(req.id)}
                                disabled={actionLoading === req.id}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {scheduleRequest && (
        <PickupScheduleDialog
          open={!!scheduleRequest}
          onOpenChange={(open) => {
            if (!open) setScheduleRequest(null);
          }}
          bookTitle={scheduleRequest.bookTitle}
          requesterName={scheduleRequest.requesterName}
          onConfirm={handleApprove}
        />
      )}
    </div>
  );
}
