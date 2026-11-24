"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Flame, MapPin, Minus, Plus, Search, ShoppingBag, Truck, X } from "lucide-react";
import type { JournalCard, StorefrontItem, StorefrontMenu } from "@/lib/types";

type CartLine = { key: string; item: StorefrontItem; modifierIds: string[]; modifierNames: string[]; unitPrice: number; quantity: number };
type Fulfillment = "TAKEAWAY" | "DELIVERY";
type OrderReceipt = { orderNumber: string; totalAmount: string; currency: string };
type Customer = { name: string; email: string };

const priceNumber = (value: string | number) => Number(String(value).replaceAll(",", "")) || 0;
const formatPrice = (value: number, currency: string) => currency === "PKR"
  ? `Rs. ${Math.round(value).toLocaleString("en-PK")}`
  : new Intl.NumberFormat("en", { style: "currency", currency }).format(value);

function categoryFor(item: StorefrontItem, index: number) {
  const name = item.name.toLowerCase();
  if (name.includes("burger") || name.includes("zinger")) return 0;
  if (name.includes("boti") || name.includes("tikka") || name.includes("kebab")) return 2;
  if (name.includes("pizza")) return 3;
  if (name.includes("drink") || name.includes("lassi") || name.includes("chai")) return 4;
  return index % 6;
}

function DishImage({ item, index, className = "" }: { item: StorefrontItem; index: number; className?: string }) {
  if (item.imageUrl) {
    // The POS image upload route serves restaurant-managed image files.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt={item.name} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  const positions = ["0% 0%", "50% 0%", "100% 0%", "0% 100%", "50% 100%", "100% 100%"];
  return <div role="img" aria-label={item.name} className={`food-tile h-full w-full ${className}`} style={{ backgroundPosition: positions[categoryFor(item, index)] }} />;
}

export function PublicStorefront({ token, menu, journal }: { token: string; menu: StorefrontMenu; journal: JournalCard[] }) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("TAKEAWAY");
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<StorefrontItem | null>(null);
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/public/${encodeURIComponent(token)}/customer/me`, { credentials: "include" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.user) { setCustomer(data.user); setCustomerName(data.user.name); } })
      .catch(() => undefined);
  }, [token]);

  const categories = useMemo(() => ["All", ...menu.categories.map((c) => c.name)], [menu.categories]);
  const products = useMemo(() => menu.categories.flatMap((c) => c.items.map((item) => ({ ...item, categoryName: c.name }))), [menu.categories]);
  const visibleProducts = products.filter((item) => (category === "All" || item.categoryName === category) && `${item.name} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  const addItem = (item: StorefrontItem, modifierIds: string[] = [], modifierNames: string[] = [], priceAdjustment = 0) => {
    requestId.current = null;
    const key = `${item.id}:${[...modifierIds].sort().join(",")}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { key, item, modifierIds, modifierNames, unitPrice: priceNumber(item.price) + priceAdjustment, quantity: 1 }];
    });
    setSelected(null);
  };

  const chooseItem = (item: StorefrontItem) => {
    if (!item.modifierGroups.length) return addItem(item);
    setSelection(Object.fromEntries(item.modifierGroups.map(({ modifierGroup }) => [modifierGroup.id, modifierGroup.modifiers.filter((option) => option.isDefault).map((option) => option.id)])));
    setSelected(item);
  };

  const confirmModifiers = () => {
    if (!selected) return;
    const groups = selected.modifierGroups.map((entry) => entry.modifierGroup);
    const invalid = groups.find((group) => {
      const count = selection[group.id]?.length ?? 0;
      return count < group.minSelect || count > group.maxSelect;
    });
    if (invalid) { setError(`Choose ${invalid.minSelect === invalid.maxSelect ? invalid.minSelect : `at least ${invalid.minSelect}`} option(s) for ${invalid.name}.`); return; }
    const ids = groups.flatMap((group) => selection[group.id] ?? []);
    const chosen = groups.flatMap((group) => group.modifiers.filter((option) => (selection[group.id] ?? []).includes(option.id)));
    addItem(selected, ids, chosen.map((option) => option.name), chosen.reduce((sum, option) => sum + priceNumber(option.priceAdjustment), 0));
    setError("");
  };

  const changeQuantity = (key: string, delta: number) => {
    requestId.current = null;
    setCart((current) => current.map((line) => line.key === key ? { ...line, quantity: Math.min(20, line.quantity + delta) } : line).filter((line) => line.quantity > 0));
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!menu.isStoreOpen || !cart.length || sending) return;
    if (!customer) {
      const session = await fetch(`/api/v1/public/${encodeURIComponent(token)}/customer/me`, { credentials: "include" }).then(async (r) => r.ok ? r.json() : null).catch(() => null);
      if (session?.user) { setCustomer(session.user); setCustomerName(session.user.name); }
      else { setAuthOpen(true); return; }
    }
    setSending(true); setError("");
    try {
      const response = await fetch(`/api/v1/public/${encodeURIComponent(token)}/customer/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientRequestId: requestId.current ?? (requestId.current = crypto.randomUUID()),
          type: fulfillment,
          phone: phone.trim(),
          ...(fulfillment === "DELIVERY" ? { delivery: { address: address.trim(), pincode: pincode.trim(), phone: phone.trim() } } : {}),
          items: cart.map((line) => ({ menuItemId: line.item.id, quantity: line.quantity, modifierIds: line.modifierIds })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message || "We couldn't send your order. Please try again.");
      setReceipt(data as OrderReceipt); requestId.current = null; setCart([]); setCartOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't send your order. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <main className="storefront-paper min-h-screen text-[#321b16]">
      <header className="sticky top-0 z-40 border-b border-[#513124] bg-[#35170f] text-[#fff5e8] shadow-sm">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <a href="#home" className="flex shrink-0 items-center gap-3" aria-label="Dogar's Fire and Flavour home">
            {menu.logoUrl ? <img src={menu.logoUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f36a00] text-[#35170f]"><Flame className="h-6 w-6 fill-current" /></span>}
            <span className="flex flex-col leading-none"><strong className="text-[17px] font-black tracking-[-.04em]">{menu.restaurantName || "DOGAR'S"}</strong><small className="mt-1.5 text-[9px] font-bold uppercase tracking-[.24em] text-[#ff9a32]">Fire &amp; Flavour</small></span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#f3dfcc] md:flex" aria-label="Main navigation"><a className="border-b-2 border-[#f36a00] pb-1 text-white" href="#home">Home</a><a className="hover:text-[#ff9a32]" href="#menu">Order online</a><a className="hover:text-[#ff9a32]" href="#story">Our story</a><a className="hover:text-[#ff9a32]" href="#journal">Journal</a><a className="hover:text-[#ff9a32]" href="#visit">Visit us</a></nav>
          <div className="flex shrink-0 items-center gap-2"><a href="#menu" className="hidden rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:border-[#ff9a32] sm:inline-flex">Explore menu</a><button onClick={() => setCartOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-full bg-[#f36a00] text-white" aria-label={`Open cart, ${cartCount} items`}><ShoppingBag className="h-5 w-5" />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-[#35170f]">{cartCount}</span>}</button></div>
        </div>
      </header>

      <section id="home" className="hero-photo min-h-[430px] text-white sm:min-h-[500px] lg:min-h-[550px]">
        <div className="mx-auto flex min-h-[430px] max-w-[1440px] items-center px-5 py-16 sm:min-h-[500px] sm:px-9 lg:min-h-[550px] lg:px-14">
          <div className="max-w-xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ffc078]"><Flame className="h-4 w-4" /> Fresh from the fire</span><h1 className="mt-6 max-w-[610px] text-[clamp(2.8rem,6vw,5.5rem)] font-black leading-[.94] tracking-[-.06em]">Fire up your <span className="text-[#ff8613]">cravings.</span></h1><p className="mt-5 max-w-md text-base leading-7 text-[#fff0df] sm:text-lg">Smoky BBQ, juicy burgers, and fresh favourites made for sharing.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#menu" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f36a00] px-6 font-bold text-white shadow-lg hover:bg-[#df5200]">Order now <ArrowRight className="h-4 w-4" /></a><a href="#story" className="inline-flex h-12 items-center rounded-full border border-white/55 bg-white/10 px-6 font-semibold text-white backdrop-blur-sm hover:bg-white/20">Our story</a></div><p className="mt-7 flex items-center gap-2 text-sm text-[#f5ddc8]"><MapPin className="h-4 w-4 text-[#ff9a32]" /> {menu.branchName} · {menu.isStoreOpen ? "Taking orders now" : "Currently closed"}</p></div>
        </div>
      </section>

      <div className="border-y border-[#e6d6c2] bg-[#fff9ef]"><div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#e6d6c2] px-4 py-4 text-center text-xs font-bold text-[#68483a] sm:grid-cols-4 sm:px-8 sm:text-sm"><p className="px-2 py-2">Fresh ingredients</p><p className="px-2 py-2">Authentic BBQ</p><p className="px-2 py-2">Made to order</p><p className="px-2 py-2">Good food, good mood</p></div></div>

      <section id="menu" className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-12 sm:px-7 sm:py-16 lg:px-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#bd5000]">Straight from our kitchen</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Guest favourites</h2><p className="mt-2 text-sm text-[#80695e]">Choose your favourites and we&apos;ll get cooking.</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80695e]" /><input aria-label="Search menu" placeholder="Search the menu" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-full border border-[#e6d6c2] bg-[#fffaf1] pl-11 pr-4 text-sm outline-none focus:border-[#f36a00]" /></div></div>
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar" role="group" aria-label="Menu categories">{categories.map((name) => <button key={name} onClick={() => setCategory(name)} className={`shrink-0 rounded-full border px-5 py-2 text-sm font-semibold transition ${category === name ? "border-[#f36a00] bg-[#f36a00] text-white" : "border-[#e2ceb7] bg-[#fffaf1] text-[#68483a] hover:border-[#f36a00]"}`}>{name}</button>)}</div>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_310px] xl:gap-9">
          <div className="menu-product-scroll grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 sm:gap-4" role="region" aria-label="Menu items; scroll to browse dishes" tabIndex={0}>
            {visibleProducts.map((item, index) => <article key={item.id} className="overflow-hidden border border-[#e6d6c2] bg-[#fffaf1] shadow-[0_4px_16px_rgba(69,43,40,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(69,43,40,.12)]">
              <button className="group relative block aspect-[1.35/1] w-full overflow-hidden bg-[#e7d6c0] text-left" onClick={() => chooseItem(item)} aria-label={`Choose ${item.name}`}><DishImage item={item} index={index} className="transition-transform duration-500 group-hover:scale-105" /><span className="absolute left-2.5 top-2.5 rounded-full bg-[#fffaf1]/95 px-2.5 py-1 text-[10px] font-bold text-[#493128]">{item.isVeg ? "Veg" : "Non-veg"}</span></button>
              <div className="p-3 sm:p-4"><div className="flex min-h-12 items-start justify-between gap-2"><div className="min-w-0"><h3 className="line-clamp-1 text-sm font-bold text-[#321b16] sm:text-base">{item.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#80695e]">{item.description || "Freshly prepared with our signature seasoning."}</p></div></div><div className="mt-3 flex items-center justify-between gap-2"><strong className="whitespace-nowrap text-sm font-black text-[#a74000] sm:text-base">{formatPrice(priceNumber(item.price), menu.currency)}</strong><button onClick={() => chooseItem(item)} aria-label={`Add ${item.name} to order`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f36a00] text-white hover:bg-[#d84900]"><Plus className="h-4 w-4" /></button></div></div>
            </article>)}
            {visibleProducts.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-[#d6bfa7] bg-[#fffaf1] px-5 py-12 text-center"><p className="font-bold">No dishes found</p><p className="mt-1 text-sm text-[#80695e]">Try another category or search.</p></div>}
          </div>

          <aside className="sticky top-[94px] hidden border border-[#e6d6c2] bg-[#fffaf1] p-5 shadow-[0_8px_28px_rgba(69,43,40,.07)] lg:block" aria-label="Your order">
            <CartContents cart={cart} currency={menu.currency} subtotal={subtotal} changeQuantity={changeQuantity} fulfillment={fulfillment} setFulfillment={setFulfillment} customerName={customerName} setCustomerName={setCustomerName} customer={customer} phone={phone} setPhone={setPhone} address={address} setAddress={setAddress} pincode={pincode} setPincode={setPincode} menu={menu} sending={sending} error={error} submitOrder={submitOrder} />
          </aside>
        </div>
      </section>

      <section id="story" className="scroll-mt-20 bg-[#35170f] text-[#fff5e8]"><div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 sm:py-16 md:grid-cols-[1fr_auto] md:items-center lg:px-12"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff9a32]">Made for your table</p><h2 className="mt-2 max-w-3xl text-3xl font-black tracking-[-.04em] sm:text-4xl">Bring everyone together over something good.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-[#e7d4c3]">From a quick lunch to a full BBQ spread, {menu.restaurantName} serves generous favourites with a little extra fire.</p></div><a href="#menu" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#f36a00] px-6 font-bold text-white">Find your favourite <ArrowRight className="h-4 w-4" /></a></div></section>

      <section id="journal" className="mx-auto max-w-[1440px] scroll-mt-20 px-4 py-12 sm:px-7 sm:py-16 lg:px-10"><div className="mb-7 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#bd5000]">From the grill, with love</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Stories from our kitchen</h2></div>{journal.length > 0 && <Link href={`/public/${token}/journal`} className="shrink-0 text-sm font-bold text-[#bd5000] hover:underline">All stories <ArrowRight className="ml-1 inline h-4 w-4" /></Link>}</div>
        {journal.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{journal.slice(0, 3).map((post) => <Link key={post.id} href={`/public/${token}/journal/${post.slug}`} className="group grid overflow-hidden border border-[#e6d6c2] bg-[#fffaf1] sm:grid-cols-[40%_1fr]"><div className="aspect-[1.5/1] bg-[#e8d8c6] sm:aspect-auto">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="hero-photo h-full min-h-32" />}</div><div className="p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#bd5000]">From our kitchen</p><h3 className="mt-2 line-clamp-2 font-black leading-6">{post.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-5 text-[#80695e]">{post.excerpt}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#bd5000]">Read story <ArrowRight className="h-3.5 w-3.5" /></span></div></Link>)}</div> : <p className="border-y border-[#e6d6c2] py-7 text-sm text-[#80695e]">We&apos;re getting our first kitchen stories ready. Come back soon.</p>}
      </section>

      <footer id="visit" className="bg-[#28110b] text-[#fff2e3]"><div className="mx-auto grid max-w-[1440px] gap-7 px-5 py-9 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:px-10"><div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#f36a00]"><Flame className="h-5 w-5 fill-current text-white" /></span><strong className="text-lg font-black">{menu.restaurantName}</strong></div><p className="mt-3 max-w-sm text-sm leading-6 text-[#d8c1ae]">Smoky grills. Burgers. Pizza. Pakistani flavours.</p></div><div><p className="text-sm font-bold">Our location</p><p className="mt-2 text-sm text-[#d8c1ae]">{menu.branchName}</p></div><div><p className="text-sm font-bold">Order help</p><p className="mt-2 text-sm text-[#d8c1ae]">Questions about an order? Call the restaurant.</p></div><div className="flex items-center gap-3 text-sm"><a href="#menu" className="hover:text-[#ff9a32]">Menu</a><Link href="/manage" className="hover:text-[#ff9a32]">Journal editor</Link></div></div><div className="border-t border-white/10 px-5 py-4 text-center text-xs text-[#c9ad98]">© {new Date().getFullYear()} {menu.restaurantName}. All rights reserved.</div></footer>

      {cartCount > 0 && <button className="fixed inset-x-4 bottom-4 z-30 flex h-14 items-center justify-between rounded-full bg-[#35170f] px-5 text-white shadow-[0_12px_35px_rgba(28,10,5,.3)] lg:hidden" onClick={() => setCartOpen(true)}><span className="inline-flex items-center gap-2 font-bold"><ShoppingBag className="h-4 w-4" /> Your order · {cartCount}</span><span className="font-black">{formatPrice(subtotal, menu.currency)} <ArrowRight className="ml-1 inline h-4 w-4" /></span></button>}
      {cartOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto bg-[#fffaf1] p-5 shadow-2xl sm:max-h-[88dvh] sm:p-7"><button onClick={() => setCartOpen(false)} aria-label="Close order" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-[#e6d6c2]"><X className="h-4 w-4" /></button><CartContents cart={cart} currency={menu.currency} subtotal={subtotal} changeQuantity={changeQuantity} fulfillment={fulfillment} setFulfillment={setFulfillment} customerName={customerName} setCustomerName={setCustomerName} customer={customer} phone={phone} setPhone={setPhone} address={address} setAddress={setAddress} pincode={pincode} setPincode={setPincode} menu={menu} sending={sending} error={error} submitOrder={submitOrder} /></div></div>}
      {selected && <ModifierDialog item={selected} selection={selection} setSelection={setSelection} onClose={() => setSelected(null)} onConfirm={confirmModifiers} currency={menu.currency} error={error} />}
      {authOpen && <CustomerAuthDialog token={token} mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSuccess={(user) => { setCustomer(user); setCustomerName(user.name); setAuthOpen(false); setError(""); }} />}
      {receipt && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4"><div role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="w-full max-w-md border border-[#e6d6c2] bg-[#fffaf1] p-7 text-center shadow-2xl"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e8f2df] text-[#1d7546]"><Check className="h-7 w-7" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-[#bd5000]">Order sent</p><h2 id="receipt-title" className="mt-2 text-2xl font-black">Thanks, {customerName}!</h2><p className="mt-3 text-sm leading-6 text-[#80695e]">Order <strong>#{receipt.orderNumber}</strong> is waiting for the restaurant to confirm. Payment is collected at pickup or on delivery.</p><p className="mt-4 text-lg font-black">{formatPrice(priceNumber(receipt.totalAmount), receipt.currency)}</p><button onClick={() => setReceipt(null)} className="mt-6 h-11 rounded-full bg-[#f36a00] px-6 font-bold text-white">Back to the menu</button></div></div>}
    </main>
  );
}

function CartContents(props: {
  cart: CartLine[]; currency: string; subtotal: number; changeQuantity: (key: string, delta: number) => void;
  fulfillment: Fulfillment; setFulfillment: (value: Fulfillment) => void; customerName: string; setCustomerName: (value: string) => void; customer: Customer | null;
  phone: string; setPhone: (value: string) => void; address: string; setAddress: (value: string) => void; pincode: string; setPincode: (value: string) => void;
  menu: StorefrontMenu; sending: boolean; error: string; submitOrder: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { cart, currency, subtotal, changeQuantity, fulfillment, setFulfillment, customerName, setCustomerName, customer, phone, setPhone, address, setAddress, pincode, setPincode, menu, sending, error, submitOrder } = props;
  return <><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#bd5000]">{menu.restaurantName}</p><div className="mt-1 flex items-center justify-between"><h2 className="text-xl font-black">Your order</h2><span className="rounded-full bg-[#f5eadb] px-3 py-1 text-xs font-bold">{cart.reduce((sum, line) => sum + line.quantity, 0)} items</span></div>
    {cart.length === 0 ? <div className="my-5 border-y border-[#eadcc9] py-8 text-center"><ShoppingBag className="mx-auto h-8 w-8 text-[#c8ae95]" /><p className="mt-3 font-bold">Your basket is empty</p><p className="mt-1 text-xs text-[#80695e]">Add something delicious to get started.</p></div> : <form onSubmit={submitOrder} className="mt-4">
      <div className="max-h-52 space-y-3 overflow-y-auto pr-1">{cart.map((line) => <div key={line.key} className="flex items-start gap-3 border-b border-[#eadcc9] pb-3"><div className="h-14 w-14 shrink-0 overflow-hidden bg-[#eadcc9]"><DishImage item={line.item} index={0} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{line.item.name}</p>{line.modifierNames.length > 0 && <p className="line-clamp-1 text-[11px] text-[#80695e]">{line.modifierNames.join(", ")}</p>}<p className="mt-1 text-xs font-bold text-[#a74000]">{formatPrice(line.unitPrice * line.quantity, currency)}</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => changeQuantity(line.key, -1)} aria-label={`Remove one ${line.item.name}`} className="grid h-7 w-7 place-items-center rounded-full border border-[#e6d6c2]"><Minus className="h-3 w-3" /></button><span className="w-5 text-center text-xs font-bold">{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.key, 1)} aria-label={`Add one ${line.item.name}`} className="grid h-7 w-7 place-items-center rounded-full border border-[#e6d6c2]"><Plus className="h-3 w-3" /></button></div></div>)}</div>
      <div className="mt-4 grid grid-cols-2 border border-[#e6d6c2] p-1"><button type="button" onClick={() => setFulfillment("TAKEAWAY")} className={`flex h-10 items-center justify-center gap-2 text-sm font-bold ${fulfillment === "TAKEAWAY" ? "bg-[#f4e3ce] text-[#321b16]" : "text-[#80695e]"}`}><ShoppingBag className="h-4 w-4" /> Takeaway</button><button type="button" onClick={() => setFulfillment("DELIVERY")} className={`flex h-10 items-center justify-center gap-2 text-sm font-bold ${fulfillment === "DELIVERY" ? "bg-[#f4e3ce] text-[#321b16]" : "text-[#80695e]"}`}><Truck className="h-4 w-4" /> Delivery</button></div>
      <div className="mt-4 space-y-3"><p className="text-xs text-[#68483a]">Ordering as <strong>{customerName || "your account"}</strong></p><label className="block text-xs font-semibold text-[#68483a]">Phone number<input required type="tel" minLength={6} maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white/70 px-3 text-sm outline-none focus:border-[#f36a00]" /></label>{fulfillment === "DELIVERY" && <><label className="block text-xs font-semibold text-[#68483a]">Delivery address<textarea required minLength={5} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, and house number" className="mt-1.5 min-h-20 w-full resize-y border border-[#e6d6c2] bg-white/70 p-3 text-sm outline-none focus:border-[#f36a00]" /></label><label className="block text-xs font-semibold text-[#68483a]">Area / postal code<input required minLength={3} maxLength={12} value={pincode} onChange={(e) => setPincode(e.target.value)} className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white/70 px-3 text-sm outline-none focus:border-[#f36a00]" /></label></>}</div>
      <div className="mt-4 flex items-center justify-between border-t border-[#e6d6c2] pt-3"><span className="text-sm text-[#80695e]">Subtotal</span><strong className="font-black">{formatPrice(subtotal, currency)}</strong></div><p className="mt-1 text-[11px] leading-4 text-[#80695e]">Final price and delivery charges are confirmed by the restaurant.</p>
      {error && <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      <button type="submit" disabled={sending || !menu.isStoreOpen} className="mt-4 flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-[#f36a00] to-[#e84900] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending order…" : menu.isStoreOpen ? customer ? "Place order" : "Sign in to checkout" : "Restaurant is closed"} {!sending && <ArrowRight className="h-4 w-4" />}</button>
      <p className="mt-2 text-center text-[10px] leading-4 text-[#80695e]">No online payment yet. Pay at pickup or on delivery.</p>
    </form>}</>;
}

function ModifierDialog({ item, selection, setSelection, onClose, onConfirm, currency, error }: {
  item: StorefrontItem; selection: Record<string, string[]>; setSelection: (value: Record<string, string[]>) => void; onClose: () => void; onConfirm: () => void; currency: string; error: string;
}) {
  const toggle = (group: { id: string; minSelect: number; maxSelect: number }, id: string) => {
    const current = selection[group.id] ?? [];
    const next = current.includes(id) ? current.filter((value) => value !== id) : group.maxSelect === 1 ? [id] : current.length < group.maxSelect ? [...current, id] : current;
    setSelection({ ...selection, [group.id]: next });
  };
  return <div className="fixed inset-0 z-[55] grid place-items-center bg-black/60 p-4"><div role="dialog" aria-modal="true" aria-labelledby="modifier-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto border border-[#e6d6c2] bg-[#fffaf1] p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#bd5000]">Customize your dish</p><h2 id="modifier-title" className="mt-1 text-xl font-black">{item.name}</h2></div><button onClick={onClose} aria-label="Close options" className="grid h-9 w-9 place-items-center rounded-full border border-[#e6d6c2]"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-5">{item.modifierGroups.map(({ modifierGroup }) => <fieldset key={modifierGroup.id}><legend className="font-bold">{modifierGroup.name}<span className="ml-2 text-xs font-normal text-[#80695e]">Choose {modifierGroup.minSelect === modifierGroup.maxSelect ? modifierGroup.minSelect : `${modifierGroup.minSelect}–${modifierGroup.maxSelect}`}</span></legend><div className="mt-2 divide-y divide-[#eadcc9] border-y border-[#eadcc9]">{modifierGroup.modifiers.map((option) => { const active = (selection[modifierGroup.id] ?? []).includes(option.id); return <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 py-3 text-sm"><span className="flex items-center gap-3"><input type={modifierGroup.maxSelect === 1 ? "radio" : "checkbox"} name={modifierGroup.id} checked={active} onChange={() => toggle(modifierGroup, option.id)} className="accent-[#e85c00]" />{option.name}</span><span className="text-xs text-[#80695e]">{priceNumber(option.priceAdjustment) > 0 ? `+ ${formatPrice(priceNumber(option.priceAdjustment), currency)}` : "Included"}</span></label>; })}</div></fieldset>)}</div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<button onClick={onConfirm} className="mt-6 h-12 w-full bg-[#f36a00] font-bold text-white">Add to order · {formatPrice(priceNumber(item.price), currency)}</button></div></div>;
}

function CustomerAuthDialog({ token, mode, setMode, onClose, onSuccess }: {
  token: string; mode: "login" | "register"; setMode: (mode: "login" | "register") => void;
  onClose: () => void; onSuccess: (customer: Customer) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    const fields = new FormData(event.currentTarget);
    const body = Object.fromEntries(fields.entries());
    try {
      const response = await fetch(`/api/v1/public/${encodeURIComponent(token)}/customer/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(", ") : result.message || "Could not sign in");
      onSuccess(result.user as Customer);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in"); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4"><div role="dialog" aria-modal="true" aria-labelledby="customer-auth-title" className="w-full max-w-md border border-[#e6d6c2] bg-[#fffaf1] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd5000]">One quick step</p><h2 id="customer-auth-title" className="mt-2 text-2xl font-black">{mode === "login" ? "Sign in to order" : "Create your account"}</h2><p className="mt-2 text-sm text-[#80695e]">Your basket will be here when you return.</p></div><button onClick={onClose} aria-label="Close sign in" className="grid h-9 w-9 place-items-center rounded-full border border-[#e6d6c2]"><X className="h-4 w-4" /></button></div><form onSubmit={submit} className="mt-6 space-y-4">{mode === "register" && <label className="block text-sm font-semibold">Your name<input name="name" required maxLength={80} autoComplete="name" className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white px-3 outline-none focus:border-[#f36a00]" /></label>}<label className="block text-sm font-semibold">Email address<input name="email" required type="email" autoComplete="email" className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white px-3 outline-none focus:border-[#f36a00]" /></label><label className="block text-sm font-semibold">Password<input name="password" required minLength={mode === "register" ? 8 : 1} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white px-3 outline-none focus:border-[#f36a00]" />{mode === "register" && <span className="mt-1 block text-xs font-normal text-[#80695e]">At least 8 characters.</span>}</label>{error && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}<button disabled={busy} className="h-12 w-full bg-gradient-to-r from-[#f36a00] to-[#e84900] font-bold text-white disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Sign in and continue" : "Create account and continue"}</button></form><p className="mt-5 text-center text-sm text-[#80695e]">{mode === "login" ? "New here?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-bold text-[#bd5000]">{mode === "login" ? "Create account" : "Sign in"}</button></p></div></div>;
}
