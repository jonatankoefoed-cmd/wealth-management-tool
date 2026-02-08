import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Wealth Management Tool",
  description: "Calm and auditable wealth management workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
