"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, MapPin, ShoppingBag, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type Item = { id: string; name: string; description: string | null; imageUrl: string | null; price: string; isVeg: boolean };
type Menu = { restaurantName: string; branchName: string; logoUrl: string | null; currency: string; isStoreOpen: boolean; categories: { id: string; name: string; items: Item[] }[] };

const SAMPLE: Item[] = [
  { id: "sample-zinger", name: "Fire Zinger", description: "Crispy chicken, lettuce and house fire sauce", imageUrl: null, price: "590", isVeg: false },
  { id: "sample-beef", name: "Beef Smash", description: "Double smash patty, cheddar and caramelized onion", imageUrl: null, price: "790", isVeg: false },
  { id: "sample-boti", name: "Malai Boti", description: "Charcoal-grilled chicken with mint chutney", imageUrl: null, price: "890", isVeg: false },
  { id: "sample-pizza", name: "Fajita Pizza", description: "Smoky chicken, peppers and mozzarella", imageUrl: null, price: "1290", isVeg: false },
  { id: "sample-fries", name: "Loaded Fries", description: "Masala fries, cheese sauce and herbs", imageUrl: null, price: "490", isVeg: true },
  { id: "sample-drink", name: "Mint Margarita", description: "Fresh mint, lime and sparkling soda", imageUrl: null, price: "290", isVeg: true },
];
const POSITIONS = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%", "100% 100%"];

function tileFor(name: string, index: number) {
  const value = name.toLowerCase();
  if (value.includes("zinger")) return 0;
  if (value.includes("beef") || value.includes("smash")) return 1;
  if (value.includes("boti") || value.includes("tikka") || value.includes("bbq")) return 2;
  if (value.includes("pizza")) return 3;
  if (value.includes("fries")) return 4;
  if (value.includes("drink") || value.includes("margarita")) return 5;
  return index % POSITIONS.length;
}

function DishPhoto({ item, index }: { item: Item; index: number }) {
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- restaurant-managed image URL
    return <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />;
  }
  return <div role="img" aria-label={item.name} className="h-full w-full bg-cover transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: "url('/images/menu-food-sheet.png')", backgroundSize: "300% 200%", backgroundPosition: POSITIONS[tileFor(item.name, index)] }} />;
}

function DishCard({ item, index, currency, href }: { item: Item; index: number; currency: string; href: string }) {
  return (
    <Link href={href} className="group overflow-hidden rounded-[22px] border border-[#E6D9C8] bg-[#FFFCF5] shadow-[0_5px_20px_rgba(69,43,40,0.06)] transition hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(69,43,40,0.12)]">
      <div className="h-44 overflow-hidden bg-[#F1E6D8]"><DishPhoto item={item} index={index} /></div>
      <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="truncate font-semibold text-[#452B28]">{item.name}</h3><b className="shrink-0 text-[#C95400]">{formatCurrency(Number(item.price.replaceAll(",", "")), currency || "PKR")}</b></div><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-[#80695E]">{item.description || "Freshly made with our signature seasoning."}</p></div>
    </Link>
  );
}

export function RestaurantLanding() {
  const token = process.env.NEXT_PUBLIC_PUBLIC_ORDER_TOKEN;
  const orderHref = token ? "/public/" + token : "#menu";
  const query = useQuery({ queryKey: ["landing-menu", token], queryFn: () => api.get<Menu>("/public/" + token + "/menu"), enabled: Boolean(token), retry: false, staleTime: 60_000 });
  const menu = query.data;
  const actualItems = menu?.categories.flatMap((category) => category.items) ?? [];
  const showSamples = process.env.NODE_ENV === "development" && actualItems.length === 0;
  const items = actualItems.length ? actualItems.slice(0, 6) : showSamples ? SAMPLE : [];
  const currency = menu?.currency ?? "PKR";
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-[#F9F4EA] text-[#452B28] [color-scheme:light]">
      <header className="sticky top-0 z-40 border-b border-[#E6D9C8]/80 bg-[#F9F4EA]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="Dogar's Fire & Flavour home" className="flex shrink-0 items-center gap-2.5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#452B28] text-[#FE8C00]"><Flame className="h-6 w-6 fill-current" /></span><span className="flex flex-col leading-none"><strong className="text-[17px] font-black tracking-[-0.055em]">DOGAR&apos;S</strong><small className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-[#C95400]">Fire &amp; Flavour</small></span></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-medium text-[#80695E] lg:flex"><a href="#home" className="text-[#C95400]">Home</a><a href="#menu" className="hover:text-[#C95400]">Menu</a><a href="#story" className="hover:text-[#C95400]">Our story</a><a href="#visit" className="hover:text-[#C95400]">Visit us</a></nav>
          <div className="flex items-center gap-2"><Link href={orderHref} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E6D9C8] bg-[#FFFCF5]"><ShoppingBag className="h-4 w-4" /></Link><Link href="/login" className="hidden rounded-full px-3 py-2 text-sm font-semibold sm:inline-flex">Staff sign in</Link><Link href={orderHref} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FE8C00] to-[#FF3B00] px-4 py-2.5 text-sm font-bold text-white shadow-md sm:px-5">Order online <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </header>

      <section id="home" className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-8 sm:px-8 md:gap-10 md:py-12 lg:grid-cols-[0.88fr_1.12fr] lg:px-12">
        <div className="relative z-10 py-4 md:py-10"><p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E6D9C8] bg-[#FFFCF5] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#80532D]"><Sparkles className="h-4 w-4 text-[#FE8C00]" /> Flame-grilled. Made with heart.</p><h1 className="max-w-[650px] text-[clamp(2.8rem,5.5vw,5.2rem)] font-black leading-[0.98] tracking-[-0.065em]">Fire up your <span className="text-[#D65B00]">cravings.</span></h1><p className="mt-6 max-w-lg text-base leading-7 text-[#80695E] sm:text-lg">Smoky BBQ, juicy burgers, and fresh favourites made for sharing. Good food at Dogar&apos;s Fire &amp; Flavour.</p><div className="mt-8 flex flex-wrap gap-3"><Link href={orderHref} className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#FE8C00] to-[#FF3B00] px-6 font-bold text-white shadow-lg">Order now <ArrowRight className="h-4 w-4" /></Link><a href="#menu" className="inline-flex h-12 items-center rounded-full border border-[#DCCDBA] bg-[#FFFCF5] px-6 font-semibold">Explore our menu</a></div><div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#80695E]"><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#D65B00]" /> Pakistan · PKR</span><span className="inline-flex items-center gap-2"><Flame className="h-4 w-4 text-[#D65B00]" /> BBQ and fast food</span></div></div>
        <div className="relative mx-auto aspect-[1.18/1] w-full max-w-[760px] overflow-hidden rounded-[30px] border-[7px] border-[#FFFCF5] bg-[#452B28] shadow-[0_24px_70px_rgba(69,43,40,0.20)] sm:aspect-[1.35/1] lg:aspect-[1.2/1]"><Image src="/images/dogars-hero.png" alt="Fire-grilled chicken burger and BBQ" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#241310]/80 to-transparent p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFC078]">Dogar&apos;s signature</p><p className="mt-1 text-xl font-bold sm:text-2xl">A little fire. A lot of flavour.</p></div></div>
      </section>

      <section aria-label="Why Dogar's" className="border-y border-[#E6D9C8] bg-[#FFF9F0]"><div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#E6D9C8] px-5 py-5 sm:px-8 md:grid-cols-4 lg:px-12">{["Fresh ingredients", "Authentic BBQ", "Made to order", "Good food, good mood"].map((text) => <div key={text} className="flex items-center justify-center gap-2 px-2 py-2 text-center text-xs font-semibold text-[#68483A] sm:text-sm"><Flame className="h-4 w-4 shrink-0 text-[#FE8C00]" />{text}</div>)}</div></section>

      <section id="menu" className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#C95400]">Straight from our kitchen</p><h2 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">Guest favourites</h2><p className="mt-2 text-sm text-[#80695E]">The flavours everyone comes back for.</p></div><Link href={orderHref} className="inline-flex items-center gap-2 text-sm font-bold text-[#C95400]">View full menu <ArrowRight className="h-4 w-4" /></Link></div>
        {items.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{items.map((item, index) => <DishCard key={item.id} item={item} index={index} currency={currency} href={orderHref} />)}</div> : <div className="rounded-2xl border border-dashed border-[#DCCDBA] bg-[#FFFCF5] px-5 py-10 text-center"><p className="font-semibold">Our menu is getting ready.</p><p className="mt-1 text-sm text-[#80695E]">Connect the public menu token to show live dishes here.</p></div>}
        {showSamples && <p className="mt-4 text-center text-xs text-[#80695E]">Development preview · sample dishes and PKR prices</p>}{query.isError && <p role="status" className="mt-3 text-center text-xs text-[#9B392C]">The live menu could not load. Please try again shortly.</p>}
      </section>

      <section id="story" className="bg-[#452B28] text-[#FFF9F0]"><div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-center md:py-16 lg:px-12"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFC078]">Made for your table</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Bring everyone together over something good.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#E8D9CB]">From a quick lunch to a full BBQ spread, Dogar&apos;s Fire &amp; Flavour serves generous favourites with a little extra fire.</p></div><Link href={orderHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FE8C00] to-[#FF3B00] px-6 font-bold text-white">Find your favourite <ArrowRight className="h-4 w-4" /></Link></div></section>

      <footer id="visit" className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 text-sm text-[#80695E] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><div><strong className="text-[#452B28]">DOGAR&apos;S FIRE &amp; FLAVOUR</strong><p className="mt-1 text-xs">Prices shown in PKR</p></div><div className="flex items-center gap-5"><Link href={orderHref}>Order online</Link><Link href="/login">Staff sign in</Link><span className="text-xs">© {year} Dogar&apos;s</span></div></footer>
    </main>
  );
}

