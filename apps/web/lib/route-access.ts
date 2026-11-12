// Route-level permission gate for the dashboard shell. Hiding a nav link is not
// an authorization boundary, so the layout also checks the URL the user opened.
// (The API enforces the same permissions; this keeps the UI from rendering
// pages that would only show errors.) Pure and dependency-free so it can be
// unit-tested with `node --test`.
import { permissionSatisfied } from "@nodedr-restaurant/types";

export interface GatedRoute {
  href: string;
  permission?: string;
  anyPermission?: string[];
}

/** Permission needed to open `pathname`, from the longest matching nav entry. */
export function requiredPermissionFor(pathname: string, routes: readonly GatedRoute[]): string | string[] | undefined {
  let best: GatedRoute | undefined;
  for (const r of routes) {
    if (pathname === r.href || pathname.startsWith(`${r.href}/`)) {
      if (!best || r.href.length > best.href.length) best = r;
    }
  }
  return best?.anyPermission ?? best?.permission;
}

export function canOpen(pathname: string, held: readonly string[], routes: readonly GatedRoute[]): boolean {
  const needed = requiredPermissionFor(pathname, routes);
  return !needed || (Array.isArray(needed)
    ? needed.some((permission) => permissionSatisfied(held, permission))
    : permissionSatisfied(held, needed));
}

/** Where to send someone who opened a page they cannot use (e.g. a waiter after login). */
export function firstAllowedHref(held: readonly string[], routes: readonly GatedRoute[]): string | undefined {
  return routes.find((r) => (!r.permission && !r.anyPermission)
    || (r.permission ? permissionSatisfied(held, r.permission) : false)
    || (r.anyPermission?.some((permission) => permissionSatisfied(held, permission)) ?? false))?.href;
}

/** Preferred first screen for built-in restaurant roles after sign-in. */
export function defaultHomeHref(roleName: string, held: readonly string[], routes: readonly GatedRoute[]): string | undefined {
  const preferred: Record<string, string> = {
    OWNER: "/dashboard", ADMINISTRATOR: "/dashboard", RESTAURANT_MANAGER: "/dashboard",
    CASHIER: "/pos", WAITER: "/pos", KITCHEN_STAFF: "/kds", CHEF: "/kds",
    BARTENDER: "/pos", DELIVERY_STAFF: "/delivery", ACCOUNTANT: "/dashboard",
    INVENTORY_MANAGER: "/inventory",
  };
  const href = preferred[roleName.toUpperCase()];
  if (href && canOpen(href, held, routes)) return href;
  return firstAllowedHref(held, routes);
}
