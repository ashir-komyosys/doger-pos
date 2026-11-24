import type { JournalCard, StorefrontMenu } from "./types";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4001";

export async function getPublicMenu(token: string): Promise<StorefrontMenu | null> {
  try {
    const response = await fetch(
      `${backendUrl}/api/v1/public/${encodeURIComponent(token)}/menu`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;
    return (await response.json()) as StorefrontMenu;
  } catch {
    return null;
  }
}

export async function getJournal(token: string): Promise<JournalCard[]> {
  try {
    const response = await fetch(
      `${backendUrl}/api/v1/public/${encodeURIComponent(token)}/journal`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return [];
    return (await response.json()) as JournalCard[];
  } catch {
    return [];
  }
}

export async function getArticle(token: string, slug: string) {
  try {
    const response = await fetch(
      `${backendUrl}/api/v1/public/${encodeURIComponent(token)}/journal/${encodeURIComponent(slug)}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;
    return (await response.json()) as JournalCard & { content: string; seoTitle: string | null; seoDescription: string | null };
  } catch {
    return null;
  }
}

export function menuApiPath(token: string, suffix = "menu") {
  return `/api/v1/public/${encodeURIComponent(token)}/${suffix}`;
}
