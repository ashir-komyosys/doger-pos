import type { Metadata } from "next";

// Public customer website shell — no sidebar, no auth, no staff links.
// The token only ever appears in the URL the restaurant shares with its
// customers. Rendered outside the dashboard branch context.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "Order online",
    description: "Browse the menu and place an order",
    robots: { index: false, follow: false },
  };
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
