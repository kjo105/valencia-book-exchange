"use client";

import { useState } from "react";
import type { CheckoutRequest } from "@/lib/validators";
import {
  cancelCheckoutRequestAction,
  selectPickupWindowAction,
} from "@/actions/checkout-requests";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CalendarCheck, CalendarClock, X } from "lucide-react";
import { toast } from "sonner";

interface RequestCardProps {
  request: CheckoutRequest;
  coverUrl?: string | null;
  memberName: string;
  memberDocId: string;
  onCancelled?: () => void;
  onWindowSelected?: () => void;
}

export function RequestCard({
  request,
  coverUrl,
  memberName,
  memberDocId,
  onCancelled,
  onWindowSelected,
}: RequestCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      const result = await cancelCheckoutRequestAction({
        requestId: request.id,
        cancelledBy: "member",
        cancellerName: memberName,
      });
      if (result.success) {
        toast.success("Request cancelled");
        onCancelled?.();
      } else {
        toast.error(result.error || "Failed to cancel request");
      }
    } catch {
      toast.error("Failed to cancel request");
    } finally {
      setCancelling(false);
    }
  }

  async function handleConfirmWindow() {
    if (selectedIndex === null) return;
    setConfirming(true);
    try {
      const result = await selectPickupWindowAction({
        requestId: request.id,
        selectedWindowIndex: selectedIndex,
        memberDocId,
      });
      if (result.success) {
        toast.success("Pickup time confirmed!");
        onWindowSelected?.();
      } else {
        toast.error(result.error || "Failed to select pickup window");
      }
    } catch {
      toast.error("Failed to select pickup window");
    } finally {
      setConfirming(false);
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    scheduled: "bg-green-100 text-green-800",
  };

  const borderColors: Record<string, string> = {
    pending: "border-yellow-300",
    approved: "border-blue-300",
    scheduled: "border-green-300",
  };

  const windows = request.pickupWindows || [];
  const chosenWindow =
    request.selectedWindowIndex !== null && request.selectedWindowIndex !== undefined
      ? windows[request.selectedWindowIndex]
      : null;

  return (
    <Card className={borderColors[request.status] || ""}>
      <CardHeader className="pb-2">
        <div className="flex gap-3">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`Cover of ${request.bookTitle}`}
              className="h-16 w-auto rounded border object-cover shrink-0"
            />
          ) : (
            <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded border border-dashed bg-muted">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{request.bookTitle}</CardTitle>
            <CardDescription>
              Requested: {formatDate(request.requestedAt)}
            </CardDescription>
          </div>
          <Badge className={statusColors[request.status] || ""}>
            {request.status === "pending" && (
              <>
                <Clock className="mr-1 h-3 w-3" />
                Pending
              </>
            )}
            {request.status === "approved" && (
              <>
                <CalendarClock className="mr-1 h-3 w-3" />
                Choose Time
              </>
            )}
            {request.status === "scheduled" && (
              <>
                <CalendarCheck className="mr-1 h-3 w-3" />
                Scheduled
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Approved: show selectable windows */}
        {request.status === "approved" &&
          request.selectedWindowIndex === null &&
          windows.length > 0 && (
            <div className="mb-3 space-y-2">
              <p className="text-sm font-medium text-blue-800">
                Select a pickup time:
              </p>
              {request.pickupNotes && (
                <p className="text-xs text-muted-foreground">
                  Note: {request.pickupNotes}
                </p>
              )}
              <div className="space-y-2">
                {windows.map((w, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                      selectedIndex === i
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          selectedIndex === i
                            ? "border-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedIndex === i && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="font-medium">{w.date}</span>
                      <span className="text-muted-foreground">
                        {w.startTime}–{w.endTime}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                onClick={handleConfirmWindow}
                disabled={selectedIndex === null || confirming}
                className="w-full"
              >
                {confirming ? "Confirming..." : "Confirm Selection"}
              </Button>
            </div>
          )}

        {/* Scheduled: show chosen window */}
        {request.status === "scheduled" && chosenWindow && (
          <div className="mb-3 rounded-md bg-green-50 p-3 text-sm">
            <p className="font-medium text-green-800">
              Pickup: {chosenWindow.date}
            </p>
            <p className="text-green-700">
              Window: {chosenWindow.startTime}–{chosenWindow.endTime}
            </p>
            {request.pickupNotes && (
              <p className="text-green-600 mt-1">{request.pickupNotes}</p>
            )}
          </div>
        )}

        {(request.status === "pending" ||
          request.status === "approved" ||
          request.status === "scheduled") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
          >
            <X className="mr-1 h-3 w-3" />
            {cancelling ? "Cancelling..." : "Cancel Request"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
