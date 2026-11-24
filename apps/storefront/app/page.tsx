import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

export default function StorefrontIndex() {
  const token = process.env.STOREFRONT_DEFAULT_TOKEN?.trim();
  if (token && /^[a-f0-9]{32}$/.test(token)) redirect(`/public/${token}`);

  return (
    <main className="storefront-paper flex min-h-screen items-center justify-center px-5 py-12">
      <div className="max-w-xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#35170f] text-[#ff8a19]"><Flame className="h-8 w-8 fill-current" /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.22em] text-[#bd5000]">Dogar&apos;s Fire &amp; Flavour</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#321b16]">The public table is almost ready.</h1>
        <p className="mt-4 text-base leading-7 text-[#80695e]">Open the public website link from Settings in your restaurant POS, or set a default branch token for the storefront.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/manage" className="inline-flex items-center gap-2 rounded-full bg-[#f36a00] px-5 py-3 font-bold text-white">Manage stories</Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e6d6c2] bg-[#fffaf1] px-5 py-3 font-semibold text-[#68483a]"><UtensilsCrossed className="h-4 w-4" /> Port 2020</span>
        </div>
      </div>
    </main>
  );
}
