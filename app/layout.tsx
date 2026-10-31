import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "plat—form | Brightloop Subscription Management System",
  description:
    "Unified software platform running the full life of a subscription business: catalog, plans, automated billing runs, payments reconciliation, and revenue reporting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0f] text-zinc-100 min-h-screen selection:bg-brand-500 selection:text-white antialiased">
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
