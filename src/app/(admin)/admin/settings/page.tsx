"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { Settings } from "@/lib/validators";
import { updateSettingsAction } from "@/actions/donations";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [checkoutDurationDays, setCheckoutDurationDays] = useState("");
  const [maxBooksPerMember, setMaxBooksPerMember] = useState("");
  const [creditCostCheckout, setCreditCostCheckout] = useState("");
  const [creditRewardDonation, setCreditRewardDonation] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "config"));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as Settings;
          setSettings(data);
          setCheckoutDurationDays(String(data.checkoutDurationDays ?? ""));
          setMaxBooksPerMember(String(data.maxBooksPerMember ?? ""));
          setCreditCostCheckout(String(data.creditCostCheckout ?? ""));
          setCreditRewardDonation(String(data.creditRewardDonation ?? ""));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    const parsed = {
      checkoutDurationDays: parseInt(checkoutDurationDays, 10),
      maxBooksPerMember: parseInt(maxBooksPerMember, 10),
      creditCostCheckout: parseInt(creditCostCheckout, 10),
      creditRewardDonation: parseInt(creditRewardDonation, 10),
    };

    if (Object.values(parsed).some((v) => isNaN(v) || v < 0)) {
      toast.error("Please enter valid non-negative numbers for all fields");
      return;
    }

    setSaving(true);
    try {
      await updateSettingsAction(parsed);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure application settings for The Missing Chapter.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Editable Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkoutDurationDays">
                Checkout Duration (days)
              </Label>
              <Input
                id="checkoutDurationDays"
                type="number"
                min="1"
                value={checkoutDurationDays}
                onChange={(e) => setCheckoutDurationDays(e.target.value)}
                placeholder="e.g. 14"
              />
              <p className="text-xs text-muted-foreground">
                Number of days a member can keep a checked out book.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxBooksPerMember">
                Max Books Per Member
              </Label>
              <Input
                id="maxBooksPerMember"
                type="number"
                min="1"
                value={maxBooksPerMember}
                onChange={(e) => setMaxBooksPerMember(e.target.value)}
                placeholder="e.g. 3"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of books a member can have checked out at once.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditCostCheckout">
                Credit Cost per Checkout
              </Label>
              <Input
                id="creditCostCheckout"
                type="number"
                min="0"
                value={creditCostCheckout}
                onChange={(e) => setCreditCostCheckout(e.target.value)}
                placeholder="e.g. 1"
              />
              <p className="text-xs text-muted-foreground">
                Number of credits deducted when a member checks out a book.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditRewardDonation">
                Credit Reward per Donation
              </Label>
              <Input
                id="creditRewardDonation"
                type="number"
                min="0"
                value={creditRewardDonation}
                onChange={(e) => setCreditRewardDonation(e.target.value)}
                placeholder="e.g. 2"
              />
              <p className="text-xs text-muted-foreground">
                Number of credits awarded when a member donates a book.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Counters (Read-Only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Next Book ID</Label>
              <Input
                value={settings?.nextBookId ?? "N/A"}
                disabled
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label>Next Member ID</Label>
              <Input
                value={settings?.nextMemberId ?? "N/A"}
                disabled
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label>Next Transaction ID</Label>
              <Input
                value={settings?.nextTransactionId ?? "N/A"}
                disabled
                readOnly
              />
            </div>

            <p className="text-xs text-muted-foreground">
              These counters are managed automatically by the system and cannot
              be edited manually.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
