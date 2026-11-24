import Link from "next/link";
import { ArrowLeft, ArrowRight, Flame } from "lucide-react";
import { getJournal, getPublicMenu } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function JournalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [menu, posts] = await Promise.all([getPublicMenu(token), getJournal(token)]);
  return <main className="storefront-paper min-h-screen px-4 py-10 sm:px-8 sm:py-16"><div className="mx-auto max-w-6xl">
    <Link href={`/public/${token}#journal`} className="inline-flex items-center gap-2 text-sm font-bold text-[#8f3b00]"><ArrowLeft className="h-4 w-4" /> Back to the restaurant</Link>
    <p className="mt-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#bd5000]"><Flame className="h-4 w-4" /> Stories from our kitchen</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">The Dogar&apos;s journal</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#80695e]">Food, fire, and the people who make our kitchen feel like home.</p>
    {posts.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <Link key={post.id} href={`/public/${token}/journal/${post.slug}`} className="group overflow-hidden border border-[#e6d6c2] bg-[#fffaf1]"><div className="aspect-[1.65/1] bg-[#ead8c2]">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="hero-photo h-full" />}</div><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#bd5000]">From the kitchen</p><h2 className="mt-2 text-xl font-black leading-6">{post.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-[#80695e]">{post.excerpt}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#bd5000]">Read story <ArrowRight className="h-4 w-4" /></span></div></Link>)}</div> : <div className="mt-10 border-y border-[#e6d6c2] py-12 text-center"><p className="font-bold">New stories are on the way.</p><p className="mt-2 text-sm text-[#80695e]">{menu?.restaurantName ?? "Our kitchen"} will be sharing something delicious soon.</p></div>}
  </div></main>;
}
