import type { Metadata } from "next";
import { getJournal, getPublicMenu } from "@/lib/backend";
import { PublicStorefront } from "@/components/public-storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const menu = await getPublicMenu(token);
  return {
    title: menu ? `${menu.restaurantName} | Order online` : "Menu unavailable | Dogar's Fire & Flavour",
    description: menu ? `Order takeaway or delivery from ${menu.restaurantName} at ${menu.branchName}.` : "This restaurant menu is not available right now.",
  };
}

export default async function PublicBranchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) return <Unavailable />;
  const [menu, journal] = await Promise.all([getPublicMenu(token), getJournal(token)]);
  if (!menu) return <Unavailable />;
  return <PublicStorefront token={token} menu={menu} journal={journal} />;
}

function Unavailable() {
  return (
    <main className="storefront-paper grid min-h-screen place-items-center px-5 text-center">
      <div className="max-w-md"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#c65300]">Dogar&apos;s Fire &amp; Flavour</p><h1 className="mt-3 text-3xl font-black text-[#321b16]">This menu isn&apos;t available right now.</h1><p className="mt-3 text-[#80695e]">Please check the link or come back in a little while.</p></div>
    </main>
  );
}
