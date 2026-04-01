import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import ThemeProvider from "./theme-provider";

export const metadata = {
  title: "Aura Knot Finance Dashboard",
  description: "Combined finance analytics across systems",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider />
        <div className="min-h-screen">
          <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--line)] bg-white p-2">
                  <Image src="/Gemini_Generated_Image_nievwrnievwrniev.svg" alt="Aura Knot logo" width={36} height={36} />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-[var(--muted)]">AURA KNOT</p>
                  <h1 className="text-lg font-bold">Finance Dashboard</h1>
                </div>
              </div>
              <nav className="flex gap-3 text-sm font-medium">
                <Link className="rounded-full border border-[var(--line)] px-4 py-2 hover:border-[var(--accent)]" href="/">Combined Profit</Link>
                <Link className="rounded-full border border-[var(--line)] px-4 py-2 hover:border-[var(--accent)]" href="/analytics">Analytics</Link>
                <Link className="rounded-full border border-[var(--line)] px-4 py-2 hover:border-[var(--accent)]" href="/reports">Reports</Link>
                <Link className="rounded-full border border-[var(--line)] px-4 py-2 hover:border-[var(--accent)]" href="/settings">Settings</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
