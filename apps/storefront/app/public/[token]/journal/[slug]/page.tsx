import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Flame } from "lucide-react";
import { getArticle } from "@/lib/backend";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string; slug: string }> }): Promise<Metadata> {
  const { token, slug } = await params;
  const article = await getArticle(token, slug);
  return article ? { title: article.seoTitle || article.title, description: article.seoDescription || article.excerpt } : { title: "Story unavailable | Dogar's Fire & Flavour" };
}

export default async function JournalArticlePage({ params }: { params: Promise<{ token: string; slug: string }> }) {
  const { token, slug } = await params;
  const article = await getArticle(token, slug);
  if (!article) return <main className="storefront-paper grid min-h-screen place-items-center px-5 text-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#bd5000]">Story not found</p><h1 className="mt-3 text-3xl font-black">This story isn&apos;t available.</h1><Link href={`/public/${token}/journal`} className="mt-5 inline-flex items-center gap-2 font-bold text-[#bd5000]"><ArrowLeft className="h-4 w-4" /> Back to stories</Link></div></main>;
  const paragraphs = article.content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return <main className="storefront-paper min-h-screen px-4 py-8 sm:px-8 sm:py-14"><article className="mx-auto max-w-3xl"><Link href={`/public/${token}/journal`} className="inline-flex items-center gap-2 text-sm font-bold text-[#8f3b00]"><ArrowLeft className="h-4 w-4" /> All stories</Link><p className="mt-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#bd5000]"><Flame className="h-4 w-4" /> From the kitchen</p><h1 className="mt-3 text-4xl font-black leading-tight tracking-[-.04em] sm:text-6xl">{article.title}</h1><p className="mt-5 text-lg leading-8 text-[#80695e]">{article.excerpt}</p>{article.publishedAt && <p className="mt-5 inline-flex items-center gap-2 text-xs text-[#80695e]"><CalendarDays className="h-4 w-4" />{new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(article.publishedAt))}</p>}{article.coverImageUrl && <img src={article.coverImageUrl} alt="" className="mt-8 max-h-[480px] w-full object-cover" />}<div className="mt-9 space-y-5 text-[17px] leading-8 text-[#4c332b]">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div><div className="mt-12 border-t border-[#e6d6c2] pt-6"><Link href={`/public/${token}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#35170f] px-5 text-sm font-bold text-white">Back to the menu <ArrowLeft className="h-4 w-4" /></Link></div></article></main>;
}
