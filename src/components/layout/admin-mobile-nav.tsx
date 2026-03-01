"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, BookOpen, BookPlus, Users, ArrowLeftRight, HandCoins, Receipt, Calculator, Upload, Download, Settings, LayoutDashboard, QrCode, RotateCcw, Clock, Inbox } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/books", label: "Books", icon: BookOpen },
  { href: "/admin/books/qr", label: "QR Codes", icon: QrCode },
  { href: "/admin/checkout", label: "Checkout", icon: BookPlus },
  { href: "/admin/checkout-requests", label: "Requests", icon: Inbox },
  { href: "/admin/checkin", label: "Check In", icon: RotateCcw },
  { href: "/admin/holds", label: "Holds", icon: Clock },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/admin/donations", label: "Donations", icon: HandCoins },
  { href: "/admin/expenses", label: "Expenses", icon: Receipt },
  { href: "/admin/accounting", label: "Accounting", icon: Calculator },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/export", label: "Export", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden border-b p-2">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Menu className="h-4 w-4" />
            Admin Menu
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <nav className="flex flex-col gap-1 mt-8">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
