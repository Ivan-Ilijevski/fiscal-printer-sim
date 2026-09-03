import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Sign in | Fiscal Printer Simulator",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Same ground and fonts as the app: signing in should not look like a different product. */}
      <body className={`${fontVariables} grain antialiased`}>{children}</body>
    </html>
  );
}
