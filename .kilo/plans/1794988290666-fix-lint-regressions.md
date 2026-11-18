# Plan: Fix dashboard layout overlap + make UI responsive across sizes

## Goal
Resolve visual layout overlap/breakage on the dashboard and ensure all key screens are responsive across mobile/tablet/desktop.

## Scope
- Dashboard: `apps/web/app/(dashboard)/dashboard/page.tsx`, `components/dashboard/*`, layout shell
- POS: `apps/web/app/(dashboard)/pos/page.tsx`, `components/pos/*`
- Inventory: `apps/web/app/inventory/*`
- Global layout: sidebar, topbar, main content padding

## Tasks
1. Audit dashboard at 375/768/1024/1440px; fix overlapping grids/flex, fixed heights, overflow.
2. Add `min-w-0`/`overflow-hidden` to flex children prone to overflow; remove hard-coded widths causing horizontal scroll.
3. Fix responsive breakpoints for stat cards and metric rows.
4. Audit POS page grid (recent change) for table-rail/checkout alignment at all sizes.
5. Audit inventory pages (list/add/edit) for mobile usability.
6. Verify sidebar/topbar don't overlap main content; adjust padding.
7. Test dialogs/overlays stacking (z-index) on small screens.

## Validation
- Visual check at 375, 768, 1024, 1440px for dashboard, POS, inventory.
- No horizontal scroll.
- Lint/typecheck pass.

## Open question
- Priority order if only partial time: dashboard first, then POS, then inventory.

