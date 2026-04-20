import {
  Home,
  Layers,
  LineChart,
  ReceiptText,
  Wallet,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavigationItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: Home,
    description: "Today, trajectory and key levers",
  },
  {
    href: "/today/budget",
    label: "Budget",
    icon: ReceiptText,
    description: "Monthly P&L and scenario editing",
  },
  {
    href: "/budget-inputs",
    label: "Budget Inputs",
    icon: SlidersHorizontal,
    description: "Assumptions Control Center",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: LineChart,
    description: "Composition and forward outlook",
  },
];

export function getNavigationMeta(pathname: string): NavigationItem {
  const item = NAV_ITEMS.find((candidate) => candidate.href === pathname);
  if (item) {
    return item;
  }
  if (pathname.startsWith("/input")) {
    return {
      href: pathname,
      label: "Advanced Assumptions",
      icon: Wallet,
      description: "Housing, debt, tax and long-range settings",
    };
  }
  if (pathname.startsWith("/today/net-worth")) {
    return NAV_ITEMS[1];
  }
  if (pathname.startsWith("/today/budget")) {
    return NAV_ITEMS[1];
  }
  if (pathname.startsWith("/budget-inputs")) {
    return NAV_ITEMS[2];
  }
  if (pathname.startsWith("/portfolio") || pathname.startsWith("/future")) {
    return NAV_ITEMS[3];
  }
  return {
    href: pathname,
    label: "Workspace",
    icon: Layers,
    description: "Financial data workspace",
  };
}
