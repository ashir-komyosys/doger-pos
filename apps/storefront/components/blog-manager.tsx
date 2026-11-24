"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, BookOpen, LogOut, Plus, Save, Send, Trash2 } from "lucide-react";
import type { BlogPostDto, SessionUser } from "@nodedr-restaurant/types";

type Branch = { id: string; name: string };
type BlogPost = BlogPostDto & { id: string; branchId: string; publishedAt: string | null; createdAt: string; updatedAt: string };
type Draft = { title: string; slug: string; excerpt: string; content: string; coverImageUrl: string; seoTitle: string; seoDescription: string };
const blankDraft: Draft = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", seoTitle: "", seoDescription: "" };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: "include", ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(", ") : body.message || "Request failed");
  return body as T;
}

const makeSlug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 140);

export function BlogManager() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editingId, setEditingId] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canManage = user?.permissions.includes("marketing.manage") ?? false;
  const selectedPost = useMemo(() => posts.find((post) => post.id === editingId), [posts, editingId]);

  const loadSession = async () => {
    try {
      const session = await api<{ user: SessionUser }>("/auth/me");
      setUser(session.user);
      const available = await api<Branch[]>("/branches");
      setBranches(available);
      const stored = localStorage.getItem("storefront-blog-branch");
      setBranchId(available.some((branch) => branch.id === stored) ? stored! : available[0]?.id ?? "");
    } catch {
      setUser(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadSession(); }, []);
  useEffect(() => {
    if (!branchId || !canManage) return;
    localStorage.setItem("storefront-blog-branch", branchId);
    setLoading(true);
    api<BlogPost[]>(`/marketing/blog-posts?branchId=${encodeURIComponent(branchId)}`).then(setPosts).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load stories")).finally(() => setLoading(false));
  }, [branchId, canManage]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); await loadSession(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Sign in failed"); }
    finally { setBusy(false); }
  };

  const signOut = async () => { try { await api("/auth/logout", { method: "POST" }); } catch { /* The expired cookie is cleared on the next sign-in. */ } setUser(null); setPosts([]); };
  const openNew = () => { setEditingId(""); setDraft(blankDraft); setSlugEdited(false); setError(""); setMessage(""); };
  const editPost = (post: BlogPost) => { setEditingId(post.id); setDraft({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, coverImageUrl: post.coverImageUrl ?? "", seoTitle: post.seoTitle ?? "", seoDescription: post.seoDescription ?? "" }); setSlugEdited(true); setError(""); setMessage(""); };
  const updateDraft = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value, ...(field === "title" && !slugEdited ? { slug: makeSlug(value) } : {}) }));

  const save = async (status: "DRAFT" | "PUBLISHED") => {
    if (!branchId) return;
    setBusy(true); setError(""); setMessage("");
    const payload = { ...draft, coverImageUrl: draft.coverImageUrl.trim() || null, seoTitle: draft.seoTitle.trim() || null, seoDescription: draft.seoDescription.trim() || null, status };
    try {
      if (editingId) await api(`/marketing/blog-posts/${encodeURIComponent(editingId)}?branchId=${encodeURIComponent(branchId)}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api(`/marketing/blog-posts?branchId=${encodeURIComponent(branchId)}`, { method: "POST", body: JSON.stringify(payload) });
      setPosts(await api<BlogPost[]>(`/marketing/blog-posts?branchId=${encodeURIComponent(branchId)}`));
      setMessage(status === "PUBLISHED" ? "Story published on the public website." : "Draft saved.");
      setEditingId(""); setDraft(blankDraft); setSlugEdited(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this story"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!editingId || !branchId || !window.confirm("Delete this story permanently?")) return;
    setBusy(true); setError("");
    try { await api(`/marketing/blog-posts/${encodeURIComponent(editingId)}?branchId=${encodeURIComponent(branchId)}`, { method: "DELETE" }); setPosts(await api<BlogPost[]>(`/marketing/blog-posts?branchId=${encodeURIComponent(branchId)}`)); openNew(); setMessage("Story deleted."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete this story"); }
    finally { setBusy(false); }
  };

  if (loading && !user) return <Shell><p className="text-sm text-[#80695e]">Loading secure journal editor…</p></Shell>;
  if (!user) return <Shell><div className="mx-auto max-w-md border border-[#e6d6c2] bg-[#fffaf1] p-6 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#35170f] text-[#f36a00]"><BookOpen className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#bd5000]">Staff access</p><h1 className="text-2xl font-black">Journal editor</h1></div></div><p className="mt-4 text-sm leading-6 text-[#80695e]">Sign in with your restaurant account. You need the Marketing permission to publish stories.</p><form onSubmit={login} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Email<input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white px-3 outline-none focus:border-[#f36a00]" /></label><label className="block text-sm font-semibold">Password<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white px-3 outline-none focus:border-[#f36a00]" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="h-12 w-full bg-[#f36a00] font-bold text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form><a href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#68483a]"><ArrowLeft className="h-4 w-4" /> Back to restaurant</a></div></Shell>;
  if (!canManage) return <Shell><div className="mx-auto max-w-xl border border-[#e6d6c2] bg-[#fffaf1] p-8"><h1 className="text-2xl font-black">Marketing access is required</h1><p className="mt-3 text-sm leading-6 text-[#80695e]">Ask an owner or administrator to grant the Marketing permission to your role.</p><button onClick={() => void signOut()} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#bd5000]"><LogOut className="h-4 w-4" /> Sign out</button></div></Shell>;

  return <Shell><div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[300px_minmax(0,1fr)]"><aside className="border border-[#e6d6c2] bg-[#fffaf1] p-5"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd5000]">Stories</p><h1 className="mt-1 text-xl font-black">Journal editor</h1></div><button aria-label="Sign out" title="Sign out" onClick={() => void signOut()} className="grid h-9 w-9 place-items-center border border-[#e6d6c2]"><LogOut className="h-4 w-4" /></button></div><label className="mt-5 block text-xs font-bold text-[#68483a]">Branch<select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1.5 h-10 w-full border border-[#e6d6c2] bg-white px-2 text-sm">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button onClick={openNew} className="mt-4 flex h-10 w-full items-center justify-center gap-2 bg-[#f36a00] text-sm font-bold text-white"><Plus className="h-4 w-4" /> New story</button><div className="mt-4 divide-y divide-[#eadcc9]">{posts.map((post) => <button key={post.id} onClick={() => editPost(post)} className={`w-full py-3 text-left ${editingId === post.id ? "text-[#bd5000]" : "text-[#321b16]"}`}><span className="block truncate text-sm font-bold">{post.title}</span><span className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[#80695e]"><span className={`h-2 w-2 rounded-full ${post.status === "PUBLISHED" ? "bg-green-600" : "bg-[#c19a76]"}`} />{post.status === "PUBLISHED" ? "Published" : "Draft"}</span></button>)}</div>{!posts.length && !loading && <p className="mt-5 text-xs leading-5 text-[#80695e]">No stories yet. Write the first one.</p>}</aside>
      <section className="border border-[#e6d6c2] bg-[#fffaf1] p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eadcc9] pb-5"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd5000]">{selectedPost ? "Edit story" : "New story"}</p><h2 className="mt-1 text-2xl font-black">{selectedPost?.title || "Write for your guests"}</h2></div>{selectedPost && <span className="text-xs text-[#80695e]">Updated {new Date(selectedPost.updatedAt).toLocaleDateString()}</span>}</div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Title" value={draft.title} onChange={(value) => updateDraft("title", value)} maxLength={140} /><Field label="URL slug" value={draft.slug} onChange={(value) => { setSlugEdited(true); updateDraft("slug", value); }} maxLength={140} /><Field label="Short excerpt" value={draft.excerpt} onChange={(value) => updateDraft("excerpt", value)} maxLength={320} /><Field label="Cover image URL (optional)" value={draft.coverImageUrl} onChange={(value) => updateDraft("coverImageUrl", value)} maxLength={2048} /></div><label className="mt-4 block text-sm font-semibold">Article text<textarea required minLength={40} maxLength={40000} value={draft.content} onChange={(e) => updateDraft("content", e.target.value)} placeholder="Write your story in paragraphs. HTML is displayed as plain text for safety." className="mt-1.5 min-h-[270px] w-full resize-y border border-[#e6d6c2] bg-white p-3 text-sm leading-6 outline-none focus:border-[#f36a00]" /></label><p className="mt-1 text-xs text-[#80695e]">Use blank lines between paragraphs. Raw HTML is not allowed.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="SEO title (optional)" value={draft.seoTitle} onChange={(value) => updateDraft("seoTitle", value)} maxLength={70} /><Field label="SEO description (optional)" value={draft.seoDescription} onChange={(value) => updateDraft("seoDescription", value)} maxLength={170} /></div>{error && <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-4 border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">{message}</p>}<div className="mt-6 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void save("DRAFT")} className="inline-flex h-11 items-center gap-2 border border-[#d8c2ab] px-4 text-sm font-bold disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button><button disabled={busy} onClick={() => void save("PUBLISHED")} className="inline-flex h-11 items-center gap-2 bg-[#f36a00] px-4 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" /> {selectedPost?.status === "PUBLISHED" ? "Update published story" : "Publish story"}</button>{selectedPost && <button disabled={busy} onClick={() => void remove()} className="ml-auto inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete</button>}</div></section></div></Shell>;
}

function Field({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength: number }) {
  return <label className="block text-sm font-semibold">{label}<input value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-11 w-full border border-[#e6d6c2] bg-white px-3 text-sm font-normal outline-none focus:border-[#f36a00]" /></label>;
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="storefront-paper min-h-screen px-4 py-7 sm:px-7 sm:py-10"><div className="mx-auto mb-7 flex max-w-7xl items-center justify-between"><a href="/" className="flex items-center gap-2 text-sm font-black"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#35170f] text-[#f36a00]"><BookOpen className="h-4 w-4" /></span> DOGAR&apos;S JOURNAL</a><a href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-[#68483a]">View website <ArrowLeft className="h-4 w-4 rotate-180" /></a></div>{children}</main>;
}
