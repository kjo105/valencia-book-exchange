"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  BookPlus,
  Users,
  ArrowLeftRight,
  HandCoins,
  Receipt,
  Calculator,
  Upload,
  Download,
  Settings,
  LayoutDashboard,
  QrCode,
  RotateCcw,
  Clock,
  Inbox,
} from "lucide-react";

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

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-muted/30 min-h-[calc(100vh-4rem)]">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
