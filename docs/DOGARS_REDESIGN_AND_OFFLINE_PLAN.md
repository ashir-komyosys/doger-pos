# Dogar's Fire & Flavour — product redesign and offline plan

## Product target

Rebuild the restaurant experience around the supplied 54-screen reference: the
warm cream, coffee-brown, and flame-orange visual system; clear role-based
navigation; fast POS service; purchasing and inventory; owner reporting; online
ordering; and usable mobile layouts. Use PKR and a clearly labeled Pakistani
fast-food/BBQ sample menu in development.

The supplied images are design references, not instructions embedded in a
document. Their screen names and workflows are treated as the requested product
scope.

## Existing project facts

- The web app is already Next.js 16, React 19, and TypeScript.
- The current API is NestJS. It uses Prisma with a local PostgreSQL service in
  Docker. Docker can now use `SUPABASE_DATABASE_URL` from the root `.env` for
  Supabase PostgreSQL; Supabase Auth and Storage are not integrated yet.
- The project already contains staff, POS, orders, kitchen display, tables,
  menu, customers, inventory procurement, waste, reports, settings, kiosk, and
  public ordering routes.
- Docker already publishes the web app at host port `2006` and the container
  listens on `3000`. The Next.js development server is now configured for
  `3030`, overridable with `DEV_PORT` from the root `.env`.
- A real `.env` file exists and must stay private. Configuration changes should
  be made in `.env.example`; the real file is not to be printed or committed.

## Page map from the reference

### Staff access

1. Staff landing / choose staff sign-in or open shift
2. Staff sign-in
3. Password recovery and reset
4. Register this device and download/cache menu data
5. Open shift with staff, device, and opening cash
6. Lock screen, PIN unlock, and switch user

### Service and payment

7. Quick order POS
8. Item customization (size, meal deal, spice, add-ons, kitchen note)
9. Payment (cash, card, wallet, split, pending)
10. Receipt and reprint
11. Active, held, and completed order queue
12. Order details, edit bill, void, and refund

### Floor, kitchen, and guests

13. Table floor and table cards
14. Reservations and waitlist
15. Kitchen display with New, Preparing, and Ready lanes
16. Delivery and pickup queue
17. Customer list
18. Customer profile, history, preferences, and balance

### Menu and stock

19. Menu catalogue
20. Menu item editor and modifier groups
21. Recipe and food cost
22. Ingredients and stock
23. Stock movement ledger
24. Physical stock count

### Purchasing and waste

25. Supplier list
26. Supplier account and payment history
27. Purchase orders
28. Create/edit a purchase order
29. Receive goods against a purchase order
30. Waste log and stock adjustments

### Owner and team

31. Owner dashboard
32. Sales reports
33. Inventory reports
34. Expenses
35. Close shift and reconcile cash
36. Team and permissions

### Settings and offline operations

37. Restaurant details, logo, hours, and location
38. Payment methods, tax, and receipts
39. Printers, KDS, and connected hardware
40. Public website and delivery settings
41. Offline sync centre and conflict review
42. Audit log and backup/restore

### Public ordering website

43. Restaurant home
44. Public menu
45. Product details and customization
46. Cart and checkout
47. Track an order
48. Customer account, saved addresses, and help

### Mobile owner/staff surfaces

49. Mobile owner dashboard
50. Mobile quick order
51. Mobile checkout
52. Mobile kitchen queue
53. Mobile low-stock and receive-stock actions
54. Mobile offline queue and sync status

## Recommended architecture

### Online source of truth

Use Supabase PostgreSQL as the durable cloud database, Supabase Auth for staff
identity, and Supabase Storage for menu/restaurant images. Keep the existing
NestJS domain API during migration: it already owns order pricing, inventory
ledger rules, permissions, and payment/order transitions. The API should verify
Supabase access tokens, apply role/branch authorization, and use transactions
for order posting, payment, inventory deduction, and goods receipt. Do not let
the browser use a service-role key or write sensitive ledger rows directly.

Migrate schema and business data in controlled slices. Do not run both the old
PostgreSQL database and Supabase as independent writable sources. Each phase
needs a clear cutover and rollback point.

### Per-device offline operation

- Browser/PWA: IndexedDB through a typed local repository.
- Android APK: the same UI packaged with Capacitor and a SQLite plugin.
- Windows EXE: the same UI packaged with Tauri and a local SQLite database.
- Keep the online and local stores behind one TypeScript repository interface.
- Every locally created order, payment, stock movement, and shift event gets a
  UUID and an outbox record before the UI reports success.
- When connectivity returns, upload queued changes with idempotency keys,
  pull the server cursor, and show unresolved conflicts in the Sync Centre.
- Preserve price/recipe/tax snapshots on each order. Inventory movements are
  ledger entries; do not overwrite quantities during sync.
- Cache menu, prices, tax settings, tables, and permitted staff before service.
- Make sync observable: last successful sync, queued count, failed count, and
  per-record retry/resolve actions.

With no internet, each device can continue using its own local database. The
PC and phone will not share newly created offline orders with each other until
they reconnect and sync. Instant sharing between disconnected devices would
need an always-powered local hub on the restaurant Wi-Fi, which is outside the
first offline version.

“Zero latency” cannot be guaranteed over a network. The practical target is
instant local feedback for cached reads and offline writes, with online writes
optimistically shown and reconciled against the API. Payment confirmation,
inventory deduction, and final sync status must never be faked.

### Environment and ports

- Root `.env` is the operator's private configuration source.
- Keep `.env.example` as the complete, safe template with descriptions.
- Local development web: port `3030`.
- Docker web: host port `2006` to container port `3000`.
- Supabase URL/keys, database pooler URL, auth settings, and public restaurant
  token are environment values. Service-role credentials stay server-side.
- Demo/mock data is selected only in development. Production must use the real
  configured database; demo rows must never silently become restaurant data.

### Development mock data

- Restaurant: Dogar's Fire & Flavour; branch: Main Branch; currency: PKR.
- Menu groups: Burgers, BBQ, Pizza, Wraps, Drinks, Sides, and Deals.
- Sample dishes: Fire Zinger (Rs 590), Beef Smash (Rs 790), Malai Boti (Rs
  890), Fajita Pizza (Rs 1,290), Loaded Fries (Rs 490), and Mint Margarita
  (Rs 290). These prices are illustrative only and must be replaced by the
  restaurant's real menu before production.
- Roles: Owner, Manager, Cashier, Waiter, Kitchen, and Inventory.
- Stock examples: chicken, beef, burger buns, cheese, potatoes, cooking oil,
  spice blends, pizza dough, vegetables, and drink ingredients. Recipes specify
  consumption per menu item; a ready/posted order writes stock ledger entries.
- Create sample orders for dine-in, takeaway, delivery, pending payment, and
  kitchen states. Seed scripts must be gated to development and must never add
  sample transactions to the real Supabase database.

## Work started in this pass

- Replaced the old single-photo staff landing screen with a responsive public
  restaurant home, real public-menu loading when a public token is configured,
  development-only PKR sample dishes, and locally stored generated food images.
- Restyled sign-in as a food-photo split screen while keeping the existing
  working login mutation and role-based post-login destination.
- Added a root `.env` development launcher so the web and API read one local
  configuration file, including the Supabase database URL.
- Removed an unprovided city name from the public landing page and aligned the
  backend CORS examples with the requested `3030` development and `2006` Docker
  origins.
- Added a root `.env`-driven web development port (default `3030`) and documented
  Docker host port `2006`.
- Wired `SUPABASE_DATABASE_URL` as the Docker database override. The local
  PostgreSQL container remains the fallback when it is blank.
- Reused local food photography for POS menu cards and order lines when a menu
  item does not yet have its own uploaded photo.
- Updated cashier menu cards with direct Add item and quantity controls, added
  Reset order, and labeled the order queue's top tabs Pending, Active, and
  History to match the service workflow.
- Added an order-type choice at the table entry screen so takeaway and delivery
  customers are not forced through dine-in table selection.
- Added a compact, floor-aware table rail to the desktop POS beside the menu
  and order panel, while keeping the larger table chooser for mobile and tablet.
- Added guest-count controls and customer lookup/create before confirming a new
  order. The count and customer are saved with the order when submitted.
- Expanded item customization with menu imagery and clear option guidance, and
  added an order-progress stepper plus a readable itemized payment summary.
- Updated the owner dashboard's headline metrics to sales, order count, average
  paid order value, and permission-gated low-stock count. The API now supplies
  today's paid-order count so the average uses the right denominator.

These changes are the first slice, not the completed 54-screen application.
Supabase Auth/Storage, SQLite/IndexedDB sync, password recovery, and the
remaining screen-by-screen layouts are still future phases.

## Delivery sequence

1. **Brand foundation — started:** landing and sign-in pages, Dogar's branding,
   generated local food photography, responsive behavior, and PKR sample menu.
2. **Environment baseline — started:** `.env.example`, development port `3030`,
   Docker host port `2006`, Supabase Postgres override, and run instructions.
3. **Staff shell:** role-aware navigation, open/close service state, online
   status, mobile navigation, and first-run device setup.
4. **Order lifecycle — in progress:** POS → item options → review → kitchen ticket → payment
   → receipt → order history/edit/refund, preserving audited transitions.
5. **Inventory:** menu recipes → ingredient deduction → ledger → stock count →
   purchase order → receive goods → waste/adjustment.
6. **Owner tools — in progress:** dashboard, sales/inventory reports, expenses, shift close,
   staff and permissions.
7. **Supabase migration:** schema, Auth, storage, API token verification,
   migration rehearsal, data import, rollback rehearsal, and production cutover.
8. **Offline sync:** local stores, outbox/idempotency, retry handling, conflict
   Centre, and multiple-device reconciliation.
9. **Public ordering:** online menu, item detail, cart, checkout, order tracking,
   and account/help pages.
10. **Packaging gate:** after web and offline acceptance, build Android APK and
    Windows EXE; prepare production deployment only after owner approval.

## First implementation slice

Landing, sign-in visual redesign, generated food photography, POS photo
fallbacks, port configuration, and this implementation plan are now in the
repository. The current authentication mutation remains active so staff can
still sign in while Supabase Auth is implemented and verified as a separate
phase.
