import {
  Home,
  Layers,
  LineChart,
  ReceiptText,
  Wallet,
  SlidersHorizontal,
  Landmark,
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
    href: "/input",
    label: "Inputs",
    icon: SlidersHorizontal,
    description: "Assumptions Control Center",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: LineChart,
    description: "Composition and forward outlook",
  },
  {
    href: "/debt",
    label: "Gæld",
    icon: Landmark,
    description: "Eksisterende gæld og SU-lån",
  },
];

export function getNavigationMeta(pathname: string): NavigationItem {
  const item = NAV_ITEMS.find((candidate) => candidate.href === pathname);
  if (item) {
    return item;
  }
  if (pathname.startsWith("/debt")) {
    return NAV_ITEMS[4];
  }
  if (pathname.startsWith("/input")) {
    return NAV_ITEMS[2];
  }
  if (pathname.startsWith("/today/net-worth")) {
    return NAV_ITEMS[1];
  }
  if (pathname.startsWith("/today/budget")) {
    return NAV_ITEMS[1];
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
