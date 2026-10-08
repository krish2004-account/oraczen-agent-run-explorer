import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: "Agent Run Explorer" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"><body>
      <nav><b>◆ Agent Run Explorer</b><Link href="/runs">Runs</Link><Link href="/dashboard">Dashboard</Link></nav>
      <main>{children}</main>
    </body></html>
  );
}
