import {
  ChartSpline,
  Home,
  House,
  Landmark,
  Layers,
  PiggyBank,
  ReceiptText,
  Wallet,
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
    description: "Snapshot and latest execution health",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: Wallet,
    description: "Holdings, import status, and pricing completeness",
  },
  {
    href: "/monthly-savings",
    label: "Monthly Savings",
    icon: PiggyBank,
    description: "Plan setup and paper execution history",
  },
  {
    href: "/debts",
    label: "Debts",
    icon: Landmark,
    description: "SU postings and debt schedule",
  },
  {
    href: "/housing",
    label: "Housing",
    icon: House,
    description: "Purchase simulation and cost impact",
  },
  {
    href: "/projection",
    label: "Projection",
    icon: ChartSpline,
    description: "Monthly timeline with housing toggle",
  },
  {
    href: "/tax",
    label: "Tax",
    icon: ReceiptText,
    description: "Tax run and audited breakdown",
  },
];

export function getNavigationMeta(pathname: string): NavigationItem {
  const item = NAV_ITEMS.find((candidate) => candidate.href === pathname);
  if (item) {
    return item;
  }
  return {
    href: pathname,
    label: "Workspace",
    icon: Layers,
    description: "Financial data workspace",
  };
}
