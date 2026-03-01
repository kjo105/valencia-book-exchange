import {
  LayoutDashboard,
  BookOpen,
  BookPlus,
  Clock,
  Users,
  Inbox,
  Calculator,
  ArrowLeftRight,
  Database,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const adminNavGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/admin/books", label: "Books", icon: BookOpen },
      { href: "/admin/checkout", label: "Checkout", icon: BookPlus },
      { href: "/admin/holds", label: "Holds", icon: Clock },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/members", label: "Members", icon: Users },
      { href: "/admin/checkout-requests", label: "Requests", icon: Inbox },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/accounting", label: "Accounting", icon: Calculator },
    ],
  },
  {
    label: "History",
    items: [
      { href: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/data", label: "Data", icon: Database },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];
