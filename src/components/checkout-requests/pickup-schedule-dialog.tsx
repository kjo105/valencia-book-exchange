"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { PickupWindow } from "@/lib/validators";

interface PickupScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookTitle: string;
  requesterName: string;
  onConfirm: (data: {
    pickupWindows: PickupWindow[];
    pickupNotes: string;
  }) => Promise<void>;
}

function emptyWindow(): PickupWindow {
  return { date: "", startTime: "10:00", endTime: "14:00" };
}

export function PickupScheduleDialog({
  open,
  onOpenChange,
  bookTitle,
  requesterName,
  onConfirm,
}: PickupScheduleDialogProps) {
  const [windows, setWindows] = useState<PickupWindow[]>([
    emptyWindow(),
    emptyWindow(),
    emptyWindow(),
  ]);
  const [pickupNotes, setPickupNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateWindow(index: number, field: keyof PickupWindow, value: string) {
    setWindows((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    );
  }

  function addWindow() {
    setWindows((prev) => [...prev, emptyWindow()]);
  }

  function removeWindow(index: number) {
    if (windows.length <= 3) return;
    setWindows((prev) => prev.filter((_, i) => i !== index));
  }

  const allWindowsValid = windows.every((w) => w.date && w.startTime && w.endTime);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allWindowsValid) return;
    setSubmitting(true);
    try {
      await onConfirm({ pickupWindows: windows, pickupNotes });
      onOpenChange(false);
      setWindows([emptyWindow(), emptyWindow(), emptyWindow()]);
      setPickupNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Pickup</DialogTitle>
          <DialogDescription>
            Approve checkout for &quot;{bookTitle}&quot; requested by{" "}
            {requesterName}. Offer at least 3 pickup time windows for the member
            to choose from.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Pickup Windows (min. 3)</Label>
            {windows.map((w, i) => (
              <div
                key={i}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Window {i + 1}
                  </span>
                  {windows.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWindow(i)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor={`date-${i}`} className="text-xs">
                      Date
                    </Label>
                    <Input
                      id={`date-${i}`}
                      type="date"
                      value={w.date}
                      onChange={(e) => updateWindow(i, "date", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`start-${i}`} className="text-xs">
                      Start
                    </Label>
                    <Input
                      id={`start-${i}`}
                      type="time"
                      value={w.startTime}
                      onChange={(e) =>
                        updateWindow(i, "startTime", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`end-${i}`} className="text-xs">
                      End
                    </Label>
                    <Input
                      id={`end-${i}`}
                      type="time"
                      value={w.endTime}
                      onChange={(e) =>
                        updateWindow(i, "endTime", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWindow}
              className="w-full"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add another window
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickupNotes">Notes (optional)</Label>
            <Textarea
              id="pickupNotes"
              placeholder="e.g., Ring the doorbell, the book will be on the shelf..."
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !allWindowsValid}>
              {submitting ? "Approving..." : "Approve & Send Windows"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
