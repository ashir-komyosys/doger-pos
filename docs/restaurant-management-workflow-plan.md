# Simple Restaurant Management System: Product and Workflow Plan

## 1. Product goal

Design the system so a small restaurant can learn it in one short training session and run a normal service without needing the owner to understand every module. The main path is:

**Open the restaurant → take an order → prepare it → serve it → take payment → review the day's records.**

The project already has many capabilities. This plan organizes them into a simpler front door and phased workflow; it does not assume every existing module should be removed or rebuilt.

## 2. Page and navigation count

### Main staff workspace: 11 pages

1. **Today** — opening checklist, service status, important numbers, and work needing attention.
2. **POS** — create and pay for orders.
3. **Orders** — find, update, and resolve current and past orders.
4. **Kitchen** — view and update kitchen tickets.
5. **Tables** — see floor/table status and handle reservations.
6. **Menu** — items, categories, prices, modifiers, and availability.
7. **Inventory** — stock, purchases, waste, suppliers, and low-stock alerts.
8. **Customers** — customer details, order history, and loyalty where enabled.
9. **Team** — staff accounts, roles, attendance, and schedules.
10. **Reports** — sales, payments, products, and financial reports according to permission.
11. **Settings** — restaurant, branch, tax, payment, printer, and system configuration.

### Access and setup: 3 screens

12. **Public landing** — explain the product and offer sign-in or account creation.
13. **Sign in** — one clear form, with two-factor entry only when required.
14. **First-run setup** — short guided setup for a new restaurant.

### Optional customer ordering: 3 screens

15. **Public menu** — menu and branch information.
16. **Customer checkout** — order type, contact details where needed, and order confirmation.
17. **Order status** — confirmation and status for the placed order.

Customer ordering pages appear only when enabled. For a restaurant using counter service only, the staff workspace is the entire day-to-day product.

## 3. Navigation and tabs

Show only five primary destinations at all times:

**Today · POS · Orders · Kitchen · Tables**

Put the other six pages under a clearly named **Manage** section:

**Menu · Inventory · Customers · Team · Reports · Settings**

On desktop, use a compact left navigation. On a phone, show the five primary destinations in the bottom bar and put **Manage** and the account menu in a clearly reachable menu. Do not show links the signed-in person's role cannot use. The server must enforce permissions too; hiding links alone is not access control.

Use tabs only to switch related views within a page:

| Page | Suggested tabs |
|---|---|
| Today | Today, optionally Previous day |
| POS | Dine-in, Takeaway, Delivery; these are order types, not separate POS pages |
| Orders | Active, Completed, Cancelled/Refunded |
| Kitchen | New, Preparing, Ready, Completed |
| Tables | Floor, Reservations |
| Menu | Items, Categories, Modifiers |
| Inventory | Stock, Purchases, Waste |
| Customers | Customers, Loyalty (only if enabled) |
| Team | Staff, Attendance, Schedule |
| Reports | Sales, Payments, Products; advanced reports behind a secondary control |
| Settings | Restaurant, Branch & Tax, Payments & Devices, Roles & Access, Advanced |

Keep the same tab position and terminology across screens. Show a count on tabs when it helps staff act (for example, **New · 4**). Do not add tabs solely to expose technical implementation areas.

## 4. First-time owner workflow

After account creation, take the owner into a setup wizard with a visible progress indicator and a **Finish later** option. Required setup should take only a few minutes:

1. **Restaurant:** name, address, timezone, and currency.
2. **Tax and payments:** tax configuration and the payment types the restaurant accepts.
3. **Menu:** create at least one category and one item, with name and price. Let the owner add more later.
4. **Service style:** choose dine-in, takeaway, delivery, or any combination. Ask for tables only if dine-in is selected.
5. **Team:** keep the owner as administrator and optionally add cashier, waiter, and kitchen accounts.
6. **Ready to open:** show a short checklist and a button to go to Today or open POS.

Do not block a counter-service restaurant on recipes, customer loyalty, online ordering, payroll, marketing, integrations, or advanced accounting. Those are optional follow-up tasks.

## 5. Owner and manager home: Today

The first signed-in page should answer: **Are we ready? What needs attention? How do I start service?**

### Before service

- Today's date and active branch.
- **Open POS** action.
- Open/close status, if the restaurant uses shifts.
- Unresolved setup checklist items, shown as a small checklist rather than a blocking wizard.
- Alerts: low stock, printer unavailable, unaccepted online orders, or reservations soon.

### During service

- Sales so far and order count (only for roles allowed to view them).
- Open orders and orders awaiting payment.
- New or delayed kitchen tickets.
- Available/occupied tables and upcoming reservations.
- Low stock alerts when inventory tracking is configured.
- Large quick actions: **New order**, **View kitchen**, **View tables**.

Every number or alert should open the relevant filtered list. Avoid decorative charts that do not lead to an action.

### At closing

- Paid orders and sales total.
- Payment totals grouped by tender type.
- Refunds, discounts, and cancelled orders.
- Cash count and variance, if shift cash closing is enabled.
- **Close day/shift** action, with a summary available before confirmation.

## 6. Cashier workflow: take an order through payment

The POS should work as one focused screen, not a chain of unrelated modules.

### A. Start order

1. Tap **New order**.
2. Select **Dine-in**, **Takeaway**, or **Delivery**. Hide order types the restaurant does not use.
3. If dine-in, choose a table. If delivery, collect the required address and contact details.
4. Optionally add a customer, guest count, or order note.

### B. Add items

1. Search or choose a menu category.
2. Tap an item to add it to the cart.
3. If it has required choices, show a small modifier sheet and require those choices before adding.
4. Adjust quantity, add item notes, or remove a line.
5. Keep the cart, subtotal, tax, discount, and total visible without scrolling away from the item list.

### C. Review and send

1. Cashier taps **Review order**.
2. Show order type/table, items, modifiers, notes, tax, discount, and total.
3. Cashier taps **Send to kitchen**. For takeaway items that do not need preparation, allow a permitted direct-to-payment path.
4. Save the order first and return a clear order number. Then create kitchen tickets for the relevant stations.
5. Show **Sent to kitchen** and a live status link. Disable repeat submission while the save is in progress and make retries safe, so a double tap cannot create duplicate orders or tickets.

Orders should be editable while open, but changes made after sending must create an updated kitchen ticket so staff do not miss them. Require a reason and appropriate permission for cancellations after kitchen work has started.

## 7. Kitchen and service workflow

### Kitchen display

- New tickets are visually distinct and ordered by age/priority.
- Each ticket shows order number, elapsed time, items, quantities, modifiers, notes, and destination (table/takeaway/delivery).
- Route items to the correct kitchen station when configured; otherwise use one simple kitchen queue.
- Staff use large touch targets to progress each ticket: **Accept → Preparing → Ready**.
- If one order has several stations, show progress by station and mark the overall order ready when all required stations are ready.
- Completed tickets move out of the active queue but remain searchable in the order record.

### Waiter handoff

- Show a visible ready count and notify the waiter/cashier in the Orders or Tables view.
- Waiter confirms **Served** when appropriate.
- For takeaway/delivery, show **Ready for pickup** or **Ready for dispatch** instead of asking kitchen staff to mark table service.
- Delivery staff update **Assigned → Picked up → Delivered** when delivery tracking is enabled.

### Human-readable order states

Use simple labels in the interface even if the database uses different enums:

**Draft → Sent → Preparing → Ready → Served / Picked up → Paid**

Also support **Awaiting acceptance**, **Cancelled**, **Partially paid**, and **Refunded** where applicable. Always show who made a meaningful change and when.

## 8. Checkout and payment workflow

1. From the open order, tap **Take payment**.
2. Show the full bill, tax, discounts, tips, amount already paid, and balance due.
3. Choose Cash, Card, UPI, or another configured tender.
4. For cash, enter the amount received and show change due.
5. For UPI/card integrations, show a pending state until the integration confirms payment. If no confirmation integration exists, require cashier confirmation; a screenshot is not proof of payment.
6. For split tender, allow multiple payments and keep the order **Partially paid** until the balance reaches zero.
7. Enable **Complete payment** only when the payment amounts cover the balance and required checks pass.
8. On success, mark the order paid exactly once, update related table status and stock records, and show the receipt.
9. Offer **Print receipt**, **Share/Download receipt**, and **New order**. Reprinting must not charge the customer again.

Discounts, voids, refunds, and bill deletion must be controlled by role permission. A refund should create a linked refund record rather than erase or rewrite the original payment.

## 9. Keep a complete record for every order

An order should be the central record connecting service, kitchen, payment, and reports. Store:

- Unique order number, branch, source, order type, table/customer when applicable.
- Staff member who created the order and timestamps.
- Item names, quantities, modifiers, notes, and price/tax snapshots from the time of sale.
- Kitchen tickets and each ticket/item status history.
- Discounts, tips, subtotal, tax, total, and any changes with actor and reason.
- One or more payment entries: method, amount, reference, time, and cashier.
- Refund entries linked to the original payment, including amount, reason, time, and approving user.
- Receipt/transaction number and final order state.

The Orders page should support search by order number, date, status, table, customer, and payment method. Opening a record should show a simple timeline: **created → sent → prepared → served → paid**, with cancellations/refunds included when relevant. Reports should calculate from these records so totals agree between POS, Orders, accounting, and reports.

## 10. Role-based day-to-day workflows

| Role | Default landing page | Can do in the normal workflow |
|---|---|---|
| Owner / Administrator | Today | All setup and operational tasks; manage staff, roles, settings, and business records. |
| Restaurant Manager | Today | Start/oversee service, resolve orders, manage menu, reservations, inventory, team operations, and permitted reports. |
| Cashier | POS | Create/edit orders, send them, take payments, print bills, and perform only permitted discounts/refunds. |
| Waiter | Tables or POS | View menu and tables, create/edit orders, send orders, see kitchen readiness, and print bills if permitted. |
| Kitchen Staff | Kitchen | Accept and update kitchen tickets; cannot see financial/admin screens by default. |
| Chef | Kitchen | Manage kitchen tickets and menu controls required for kitchen operations. |
| Inventory Manager | Inventory | Update stock, record purchases/waste, manage suppliers, and view relevant stock reports. |
| Delivery Staff | Orders / Delivery | See assigned deliveries and update pickup/delivery status. |
| Accountant | Reports | Review financial records and export permitted reports; no POS or menu editing by default. |

On login, send each role to its first useful permitted page. Keep the current branch visible and make branch switching explicit. Owners can customize permissions, but common roles should work without requiring a permissions setup project.

## 11. Page details and useful controls

### Orders

- Tabs: **Active**, **Completed**, **Cancelled/Refunded**.
- Search and filters are secondary to the active orders list.
- Each row/card shows order number, age, table/type, total (if permitted), and next action.
- One tap opens detail; high-risk actions require a reason and authorized confirmation.

### Tables

- Floor map/list with clear available, occupied, reserved, and needs-payment states.
- Tapping a table opens its current order or starts a new one.
- Moving/combining tables should preserve order history and require a clear confirmation.

### Menu

- One prominent **Add item** action and clear prerequisites. If no category exists, offer **Create a category first** rather than a dead disabled button.
- Required fields should be few: name, category, price, tax. Advanced dietary, scheduling, recipe, and modifier controls stay optional.
- Show save progress and a visible success/error message; refresh the list after success.

### Inventory

- Default page: stock list and low-stock alerts.
- Record stock in, stock out, waste, and supplier purchase with simple forms.
- Recipe-level automatic deduction is optional; do not require every small restaurant to create recipes before using POS.

### Reports

- Default: today's sales and payments.
- Date range and export controls are easy to find but do not dominate the screen.
- Financial and payroll details require the appropriate permission.

## 12. Friendly safeguards and error handling

- Every save action has a visible pending state, success result, and readable error.
- Keep entered form values when a request fails; never silently clear a failed order.
- Prevent accidental duplicate orders/payments when a user double taps or a request times out.
- Distinguish **not sent**, **sent**, **payment pending**, and **paid** clearly.
- If the internet/server connection is lost, state what has and has not been saved. Do not claim an order is saved until the server confirms it. Offline queuing should be a separate tested capability, not an implied promise.
- Ask for a reason on cancellation, void, refund, discount over policy, and stock adjustment.
- Use accessible labels, keyboard support, large touch targets, and plain language.
- Show empty states with the next step: e.g. **No menu items yet → Add a category → Add an item**.

## 13. Build plan

### Phase 1 — Make the core path dependable

1. Role-aware login redirect and simple Today page.
2. Fast POS with dine-in/takeaway/delivery, cart, review, save, and send.
3. One reliable Orders list/details view.
4. Kitchen tickets with clear ready handoff.
5. Payment, receipt, and complete order history.

### Phase 2 — Run a shift

1. Tables and reservations.
2. Day/shift opening and closing summary.
3. Searchable reports and permission checks.
4. Customer history and refunds.

### Phase 3 — Add operations as needed

1. Inventory, suppliers, purchasing, and recipe deduction.
2. Staff attendance, schedules, and payroll.
3. Public/QR ordering, delivery tracking, marketing, accounting, integrations, backups, and advanced settings.

Keep existing advanced capabilities reachable to owners, but place them behind **Manage** or **Advanced** until the restaurant enables them. Do not add all modules to the cashier or waiter workflow.

## 14. Acceptance checklist

The first release is ready for a small restaurant when:

- A new owner can set up a branch, create a category/item, and reach POS without reading a manual.
- A cashier can create a dine-in or takeaway order in a few clear steps and gets an order number after the save succeeds.
- Sending an order creates kitchen tickets once, with item notes and modifiers intact.
- Kitchen staff can move a ticket to Ready and front-of-house can identify the correct order immediately.
- A cashier can take cash or configured electronic payment, handle a split payment if enabled, and close the order only when the balance is settled.
- A reprinted receipt does not create another payment.
- Owner can find the same order later and see its items, kitchen history, payments, refunds, and staff actions.
- Daily sales and tender totals reconcile with completed order/payment records.
- Every role sees the right landing page and cannot access protected actions by guessing a URL or calling an API directly.
- Empty, loading, failed, and offline states explain the next safe action instead of appearing unresponsive.

## 15. Senior developer simplification strategy

### Current complexity to address

The dashboard currently has 17 top-level navigation entries and 34 dashboard `page.tsx` routes, including nested settings and inventory pages. This is useful breadth for a mature product, but it asks a new owner or cashier to understand too much before finding the everyday workflow. The solution is to reduce what each role sees at once and group related capabilities, while retaining access to every existing function.

### Product rules

1. **Five daily destinations stay visible:** Today, POS, Orders, Kitchen, Tables. Staff should not need to inspect every module to perform a shift.
2. **Everything else is grouped under Manage:** Menu, Inventory, Customers, Team, Reports, Settings. Within each group, related advanced pages can remain available as tabs or secondary links.
3. **Role determines the default route and visible actions:** owner/manager → Today, cashier → POS, waiter → Tables or POS, kitchen → Kitchen, accountant → Reports, inventory manager → Inventory. No staff member should land on a page they cannot use.
4. **Use plain language in the interface:** “Take payment,” “Send to kitchen,” and “Ready to serve,” not backend terms or ambiguous icons.
5. **Progressively reveal detail:** show the common fields first; put recipe cost, tax overrides, integrations, API keys, webhooks, backups, payroll, marketing, and other less frequent tools in the relevant Manage group or Advanced section.
6. **One record follows the whole order:** POS, kitchen tickets, table view, payment, receipt, and reports must reference the same order and history.
7. **Do not remove capabilities to make screens look simpler:** group and permission-gate them. Existing URLs should continue to work while navigation is reorganized; redirect only after the replacement path is verified.

### What to consolidate

- **Reservations into Tables:** keep the table map as the default, with reservations as a tab and a clear “Upcoming” view.
- **Delivery into Orders:** show delivery details and dispatch status on the order; maintain delivery settings and zone configuration in Manage.
- **Inventory sub-pages into Inventory tabs:** stock is the default; purchases, suppliers, transfers, and waste are secondary views.
- **Staff sub-pages into Team tabs:** staff list first; attendance, schedules, leave, payroll, and staff security tools are secondary tabs, permission-gated.
- **Accounting and Marketing out of daily navigation:** keep them under Reports/Manage for owner, manager, and accountant roles as appropriate.
- **Deep settings under Settings:** restaurant/branch first; roles, backups, API keys, webhooks, sync, app updates, and compliance are under Advanced or the relevant settings tab.
- **Keep Kitchen as a dedicated page:** it is a separate high-urgency workspace, not a report or settings page.

This is a navigation and information-architecture proposal. Before combining pages in code, verify which screens have workflows that need to stay separate and retain their permissions.

### Implementation sequence

#### Step 1 — Audit and classify

- Inventory every current dashboard route, action, permission, and role.
- Label each capability as **daily**, **weekly**, **setup**, or **advanced**.
- Record which actions write financial, staff, or inventory data and the exact permissions protecting them.
- Identify duplicated entry points and places where staff must re-enter the same order/customer/table data.

**Deliverable:** a route-to-role map and a capability checklist so simplification cannot silently drop a function.

#### Step 2 — Establish the role-based shell

- Replace the flat 17-link sidebar with five daily links plus a Manage section containing six groups.
- Add a consistent branch selector, connection state, notifications, and account menu.
- Choose the role landing route from permissions rather than hard-coded role names.
- Keep unauthorized routes and API actions protected even when a user guesses a URL.

**Deliverable:** each role sees a useful home and a short, predictable navigation.

#### Step 3 — Make the service loop work end to end

- Make Today show only actionable service information.
- Streamline POS into order type → items → review → send.
- Make the same order visible in Orders and Kitchen immediately after the server confirms save.
- Make kitchen readiness visible to waiter/cashier without refresh hunting.
- Make checkout prevent duplicate payment, support the configured payment methods, and produce a searchable receipt/record.

**Deliverable:** a cashier can complete a real test order and a manager can find the complete record afterward.

#### Step 4 — Simplify management workspaces without deleting features

- Group routes as in “What to consolidate.”
- Keep common actions one click away and advanced actions behind secondary tabs.
- Make long forms short by default; label advanced fields and explain when they matter.
- Add useful empty/loading/error/saved states with a next action.
- Ensure every action provides clear status feedback and preserves entered values on failure.

**Deliverable:** advanced modules remain usable, but they do not crowd cashier, waiter, or kitchen views.

#### Step 5 — Verify with realistic role scenarios

Run scripted walk-throughs with disposable test data for: owner setup, cashier takeaway order, waiter dine-in order, kitchen preparation, split payment/refund, inventory receiving, and accountant daily reconciliation. Verify both the screen and the stored records; do not treat a success toast alone as proof of persistence.

**Deliverable:** evidence that the function still works and that only authorized roles can perform it.

#### Step 6 — Release gradually

- Ship the new navigation behind a reversible feature flag or staged branch.
- Migrate one workflow at a time; keep old routes reachable during the transition.
- Monitor failed saves, duplicate orders/payments, permission denials, and support reports.
- Remove obsolete navigation only after the new route has parity and users can still find the function.

### Simplicity measures

- A cashier can begin a new order in one obvious action from the first screen.
- The common cashier flow does not require visiting Settings, Reports, Inventory, or Team.
- A kitchen worker sees tickets and status actions only, without sales/finance clutter.
- An owner can reach every enabled function through Today or Manage, but only five daily destinations are always prominent.
- Common actions have clear labels; no critical action is represented by an unexplained icon alone.
- Every feature in the existing capability checklist maps to a visible role-appropriate route or action before old navigation is retired.
- A failed save explains what happened, preserves entered data, and does not claim success.

## 16. File-by-file implementation plan for this repository

This is the proposed edit list for the first simplification release. It is not permission to remove a capability; keep every current route and backend action until its replacement has been verified.

### Change set A — Navigation and role landing (first)

1. **`apps/web/components/layout/nav-items.ts`** — add navigation groups and explicit landing metadata. Organize current links into daily work and Manage. Keep each existing `href` and permission key. Give Attendance its actual `attendance.manage` permission; it currently has no permission on its nav item.
2. **`apps/web/components/layout/sidebar-nav.tsx`** — render a short Daily work group and a collapsed Manage group instead of all current entries as a flat list. Keep active-route highlighting and permission filtering.
3. **`apps/web/components/layout/mobile-bottom-nav.tsx`** — keep four thumb-reachable links plus More, selected by role/landing config. Prioritize POS for cashiers, KDS for kitchen-only users, Tables/POS for waiters, and Today/POS for managers. The current fixed list is filtered and cut to four, which can produce an unexpected set for some roles.
4. **`apps/web/components/layout/app-shell.tsx`** — adjust labels/group headings and ensure Manage is reachable on phone and desktop without changing shell behavior or page URLs.
5. **`apps/web/lib/route-access.ts`** — add a single tested helper to choose a user's configured/default home only from routes that their permissions allow. Keep the current first-allowed route as a safe fallback.
6. **`apps/web/app/(dashboard)/layout.tsx`** — use that helper after authentication instead of depending on `NAV_ITEMS` order. Preserve the existing route-level gate and server API authorization.

**Result:** all existing pages still open, but each role sees the right starting page and a smaller, grouped navigation.

### Change set B — A useful Today page without leaking sales

The existing dashboard route and both dashboard API endpoints require `dashboard.sales.view`. `RESTAURANT_MANAGER` does not receive that permission by default, so simply redirecting managers to `/dashboard` would send them to an unauthorized screen. Do not solve this by granting financial access or hiding revenue only in React.

1. **`packages/types/src/permissions.ts`** — if the product wants managers to have an operational Today page, add a distinct `dashboard.operations.view` permission and grant it to the default manager role. Keep `dashboard.sales.view` for financial metrics.
2. **`apps/backend/src/modules/dashboard/dashboard.controller.ts`** and **`dashboard.service.ts`** — add a minimal operations-only endpoint for open orders, kitchen queue, table status, and upcoming reservations. It must not return revenue, payment, or financial totals.
3. **`apps/web/hooks/use-dashboard.ts`** — add a typed hook for that operations-only endpoint.
4. **`apps/web/app/(dashboard)/dashboard/page.tsx`** — show financial cards/trends only when the user has `dashboard.sales.view`; show operational cards only when allowed. Make each card open the relevant filtered page. Keep today's revenue chart available to owner/accountant roles that can view it.

If introducing a new permission is out of scope for the first release, keep managers on their first allowed operational page (POS or Orders) until the permission-protected Today view is ready.

### Change set C — Finish the daily order path

1. **`apps/web/app/(dashboard)/pos/page.tsx`** and **`apps/web/components/pos/*`** — simplify the cashier's visible steps to order type, items/cart, review, and send. Keep modifiers, discounts, delivery details, split bills, and other existing functions available when relevant and authorized; do not remove their API support.
2. **`apps/web/app/(dashboard)/orders/page.tsx`** and **`apps/web/components/orders/*`** — make Active the initial view, keep past/cancelled/refunded views secondary, and preserve detailed order history, refunds, and permitted edits.
3. **`apps/web/app/(dashboard)/kds/page.tsx`** and **`apps/web/hooks/use-kds.ts`** — make the kitchen queue status-first and touch-friendly. Keep station routing and existing ticket lifecycle intact.
4. **`apps/web/app/(dashboard)/tables/page.tsx`** — make the floor/table status the default and link each occupied table directly to its open order. Keep reservations accessible as a secondary view.
5. **`apps/backend/src/modules/orders/*`** — change only if verification finds duplicate-submit, status, payment, or audit-record gaps. Preserve existing concurrency guards and permission checks.

### Change set D — Group management screens, preserve deep links

1. Keep current menu, inventory, customer, team, report, accounting, marketing, operations, and settings routes live during the transition.
2. Add section landing pages or tabs that place routine work first and advanced pages second. Prefer navigation grouping before large page rewrites; this gives most of the simplicity gain with less regression risk.
3. Move only closely related workflows together (for example reservations under Tables and supplier/waste pages under Inventory). Do not combine unrelated modules just to reduce route count.
4. Keep direct URL permission checks in `apps/web/app/(dashboard)/layout.tsx`; ensure each nested route is mapped to the correct permission.

### Change set E — Verify before rollout

- Walk through the default seeded roles in `packages/types/src/permissions.ts`: owner, manager, cashier, waiter, kitchen staff, chef, delivery staff, accountant, and inventory manager.
- Verify each home route, sidebar group, phone navigation, direct URL denial, and API denial.
- Use disposable test data for dine-in and takeaway orders. Verify one saved order produces the expected kitchen ticket, payment, receipt, and searchable history without duplicates.
- Verify an unauthorized user cannot see financial data in the UI or receive it from the API.
- Do not remove old links/routes until all capability-to-route mappings and role walk-throughs pass.

### Explicitly out of scope for this first change set

- Replacing the database or rewriting all modules.
- Removing accounting, marketing, payroll, online ordering, compliance, integrations, backup, or sync features.
- Broad permission changes for convenience.
- Renaming or deleting routes before equivalent pages and redirects are verified.
- Claiming offline order queuing works unless it is separately implemented and validated end to end.

### Required post-edit walkthrough for the user

After implementing and verifying the UI changes, include two short, concrete walkthroughs in the handoff. Base them on the actual finished screens, permissions, and sample data—not mock screenshots or assumed features.

**Manager example:** sign in → arrive at the operations-focused Today page → notice an unaccepted order or delayed kitchen ticket → open the order/queue → follow its progress → check the relevant table or stock alert → close the shift summary if permitted. Clearly show that revenue details remain hidden unless this manager is granted the financial permission.

**Owner / administrator example:** sign in → arrive at Today with permitted sales and operations summary → open POS and create a takeaway test order → send it to Kitchen → mark it Ready → take payment → re-open the completed order and verify its receipt/payment/timeline → go to Manage to update menu or staff permissions. Use disposable test data and identify which capabilities require configuration first.

## 17. Owner or manager taking a dine-in order

### Goal

Make the POS feel like a guided conversation with the customer. A manager or owner should be able to take the order personally or assign a waiter, confirm it with the customer, send it to the kitchen, and later find the same order for billing and history. Keep the cashier's common path short and leave advanced controls out of the way.

### Proposed POS sequence

Use one POS page with a clear progress header. On desktop, the selected order remains visible beside the current step; on a phone, use a single focused step with a persistent order summary.

1. **Start the visit**
   - Choose **Dine-in**, **Takeaway**, or **Delivery**. Dine-in is the default only when tables are configured.
   - For dine-in, choose a table from the floor grid. Show Available, Occupied, and Reserved clearly. Selecting an occupied table must offer its existing open order before starting another bill.
   - Add the customer name (or find an existing customer) when known. Keep it optional for walk-in guests.
   - Assign a waiter from active staff who can serve at this branch. Default to the signed-in user, with a clear **I am serving this table** option. Preserve the signed-in user as the order creator for audit history; assignment must not replace the creator.
   - Optional: guest count and one order-wide note (for example, “birthday” or “allergy—confirm with customer”).
2. **Choose from the menu**
   - Show simple sections: **Food**, **Drinks**, and **Deals**, then searchable item cards with prices.
   - Map these sections to the restaurant's configured menu categories. For the first version, a deal can be a priced menu item in a Deals category; do not require a complex bundle builder to take orders.
   - Tapping an item with choices opens its options before it enters the order. Use configured modifiers for spice level (**Mild, Normal, Spicy, Extra spicy**) and any required choices. Include **No spice / bland** only where that item supports it; do not invent a spice choice for every drink or dessert.
   - Let staff set quantity and add an optional item-specific kitchen note. Display modifiers and notes in the order summary.
3. **Review with the customer**
   - Show customer name, table, assigned waiter, every item, quantity, choices, notes, subtotal, tax, discount if authorized, and total.
   - Allow the staff member to go back to the menu or edit the quantity, choices, and notes.
   - Use **Confirm order** as the explicit checkpoint. Confirmation saves the order as open and unpaid, but does not yet imply that the kitchen has received it.
4. **Send and print for the kitchen**
   - After confirmation, show **Send to kitchen** and **Print kitchen ticket** as clear actions. Sending creates the kitchen ticket once and updates the order to **Sent**. If printing fails, keep the order saved and let staff retry printing without making a second order or ticket.
   - The kitchen ticket contains order number, table, waiter/customer label when useful, items, quantities, spice choices, item notes, and time. It does not contain prices or payment details.
   - Once sent, show a visible status and open the saved order. Later changes require a new kitchen update/ticket and should identify the changed items.
5. **Serve, bill, and pay**
   - Kitchen updates the same order through **Preparing → Ready**. Front-of-house marks it **Served** when appropriate.
   - Open the order to review or edit the bill. Require permission and a reason for sensitive changes after kitchen work has started; send item changes back to the kitchen.
   - The customer bill/receipt shows restaurant and branch name, bill/order number, date/time, table number for dine-in, customer name if entered, waiter, item choices, totals, payments, and balance due. Keep this distinct from the kitchen ticket.
   - Offer configured tenders such as **Cash, Card, Wallet, UPI, Other**. Cash records amount received and change. Card/wallet/UPI remain **Payment pending** until the configured integration confirms them or an authorized staff member records confirmation. “Pending” is a payment/order state, not a payment method.
   - Allow the order to stay **Unpaid** or **Partially paid** and return to it later. Mark it **Paid** only after recorded payments cover the balance. Print or reprint the customer receipt without charging again.
6. **Find it later**
   - Orders opens on **Needs attention** / pending work, sorted oldest first: awaiting kitchen send, awaiting acceptance (for online orders), preparing/ready, and unpaid/partially paid.
   - Keep **Active**, **Completed**, and **Cancelled/Refunded** views, with recent pending/active work shown above history. Search by order number, table, customer, waiter, date, and status.
   - Opening an order shows the same table/customer/waiter details, current balance, kitchen tickets, payment entries, receipt action, and an event timeline. Completed orders remain read-only except for permitted refund/correction actions.

### What the current project already supports

- POS already opens a visual table picker for a new dine-in order, loads configured menu categories, supports item modifiers/portions, maintains per-table unsent drafts, detects existing open bills, and submits orders to the backend.
- The current submit button saves the order and sends it to the kitchen in the same action. There is no separate customer review/confirm step followed by an explicit send action yet.
- The order schema already keeps creator, customer link/name, table, order-wide notes, item kitchen notes, price snapshots, kitchen tickets, payment entries, and order status. It does not currently store a separate assigned waiter/server.
- Checkout already offers several payment methods and receipt actions. Kitchen tickets and customer receipts are separate print formats; the kitchen ticket omits prices.
- The POS does not currently provide a guided waiter assignment, customer-name entry as part of dine-in start, a whole-order note, dedicated Food/Drinks/Deals sectioning, or an explicit review/confirm checkpoint. The Orders page and saved states should be reviewed before defining the final pending/history tabs.

### Implementation plan for this workflow

1. **Confirm the order model and state transitions** in `apps/backend/prisma/schema.prisma` and `apps/backend/src/modules/orders/*`. Add a separate assigned-server relation while retaining `createdById`. Add an explicit sent-to-kitchen state/time or equivalent audited event. Define whether a saved-but-unsent order can be edited/cancelled and how the Orders page surfaces it.
2. **Make kitchen sending a distinct, idempotent action.** Split “create confirmed order” from “send confirmed order to kitchen”; protect against duplicate tickets on double tap/retry. Keep the existing one-action order path available as an explicit **Confirm & send** shortcut for counter service if the restaurant prefers it.
3. **Add the guided POS steps** in `apps/web/app/(dashboard)/pos/page.tsx` and `apps/web/components/pos/*`: service details (table, customer, waiter, notes) → menu sections and item choices → customer review → saved order actions. Persist a draft only when appropriate; do not show a saved/sent success until the API confirms it.
4. **Configure menu choices** using the existing categories and modifier groups first. Give modifiers clear single-select or multi-select rules and prices. Keep fixed-price deals as menu items in the Deals category for v1; add true bundled inventory behavior only if the restaurant later requires it.
5. **Add waiter assignment support** to the order DTO/service, data model, order detail, and receipt. Add a migration with a safe nullable assignment for existing orders. Restrict assignment choices to active staff with branch access and keep the creator in audit records.
6. **Update order notes and item notes** in the POS and review screen, and verify that both reach the kitchen ticket. Allergy or safety notes should be visually prominent and must not be silently truncated by printer output.
7. **Reshape Orders around work status** in `apps/web/app/(dashboard)/orders/page.tsx` and `apps/web/components/orders/*`: pending/needs attention at top, then active and history. Keep API filters aligned with states; do not classify an unpaid but already served order as completed until payment is settled.
8. **Keep payment status separate from tender type** in checkout and records. Verify cash, card, wallet/UPI, other tender, partial payment, pending electronic confirmation, reprint, and refund paths against the existing payment model before changing schema.
9. **Verify both printouts:** kitchen ticket has table/order, assigned waiter, quantities, modifiers/spice, and notes without prices; customer receipt has restaurant/branch, bill number, customer/table, line totals, payment method(s), paid/balance state, and does not create another payment when reprinted.

### Acceptance walkthrough

Use a disposable dine-in order: sign in as owner or manager → choose Table 4 → assign the signed-in owner or a waiter → enter “Amina” → select one item from Food and one deal → set the food to Mild and add “no onions” → review the full order with the customer → confirm → send to kitchen and print the kitchen ticket → mark Preparing and Ready → open the order and verify its table, customer, waiter, choices, and notes → print the customer bill → accept part cash and part card (or leave it unpaid) → finish payment → find the completed order in history and reprint the receipt. At each step, the order number stays the same and a retry does not create duplicate orders, tickets, or payments.

## 18. Open or close the restaurant

### Staff-facing control

Add a clearly visible **Open store** / **Close store** button to the owner/manager **Today** page, beside a persistent status badge: **Open** or **Closed**. Display the current branch, who last changed the status, and when. This controls whether the restaurant is accepting new business; it is separate from a staff member clocking in/out and from the end-of-day cash closing.

### Opening

1. An authorized owner or manager selects **Open store**.
2. Show a short readiness panel: branch, menu availability, tables configured (when dine-in is enabled), kitchen/printer status, and any important unresolved issue. These are warnings and quick links; do not require advanced setup to open a simple restaurant.
3. Confirm **Open for service**. Save the status and actor/time, update Today immediately, and enable new POS orders and configured online/QR ordering for that branch.

### Closing

1. The manager selects **Close store** and sees a review before confirming: open orders, orders not yet sent to kitchen, kitchen tickets not ready, unpaid/part-paid bills, reservations still due, and (if enabled) cash-close summary.
2. Each item links to the order or task that needs attention. The manager can return to resolve it or confirm closure with the outstanding work listed. Do not silently delete, cancel, or mark orders paid to make the store appear closed.
3. After **Close for service** is confirmed, block creation of new dine-in/takeaway orders and stop accepting new online orders for that branch. Keep existing orders, kitchen work, payment, refunds, and history accessible so staff can finish service and settle bills. Clearly label remaining work as carried over/open.
4. Record who closed the branch, when, and optional reason. Reopening is an explicit action and creates a new status event; retries must not create duplicate events.

### Access and edge cases

- Add a dedicated `store.status.manage` permission for the open/close control. Grant it to owner, administrator, and restaurant manager defaults. Cashiers, waiters, and kitchen staff can see the status but cannot change it unless an administrator explicitly grants access.
- Enforce the state on backend order creation and online order acceptance, not only by disabling a button in the POS. Return a readable “This branch is closed” response and retain any unsaved cart so the user can recover it.
- Existing orders remain editable only as allowed by their normal permissions; closing the store must never erase or rewrite order/payment history.
- Multi-branch restaurants have an independent status per branch. The UI must show which branch is being opened or closed before confirmation.
- Keep staff attendance (`Clock in` / `Clock out`), planned employee shifts, restaurant service status, and cash closing as four separate concepts with distinct labels.

### Implementation order

1. Add branch-level store status plus an append-only open/close event record and migration; define the initial status for existing branches safely.
2. Add the permission key/default grants and a branch-scoped status read/update API with audit actor, timestamp, and idempotent updates.
3. Add backend guards to staff order creation and incoming online-order acceptance while closed; preserve access to existing order service and payment routes.
4. Add the status badge, open/close button, readiness panel, and closing review to Today. Link each warning to its existing task screen.
5. Verify owner, manager, cashier, kitchen, and multi-branch scenarios, including a close with unpaid orders, reopening, API bypass attempts, and carts preserved after a closed-store response.

### Acceptance walkthrough

Owner signs in at the Main Branch → sees **Closed** → checks readiness → selects **Open store** → confirms → POS accepts a new order. At closing, the manager selects **Close store** → sees one unpaid table and one kitchen ticket still preparing → opens those records or confirms closure while leaving them visible → new orders are blocked, but kitchen staff can finish the ticket and cashier can take payment → the manager reopens the branch next service and the event history shows both changes.

## 19. Full implementation roadmap for this repository

This roadmap combines the role/navigation work, the owner/manager order-taking flow, and the store open/close control into a dependency-ordered delivery plan. Keep the existing routes and backend capabilities during implementation; make the everyday path simpler by connecting them and revealing advanced controls only when needed.

### Current implementation baseline

- **Already implemented in the current working tree:** role-aware login/signup destinations; a manager-only operations dashboard API and view that does not return revenue; a distinct `dashboard.operations.view` permission; three sidebar group headings; and one-time permission backfill for existing manager roles.
- **Already present in the project:** POS table picker, configured menu categories, modifier/portion selection, per-table unsent drafts, open-bill detection, order creation, kitchen tickets and separate kitchen/customer print formats, order notes and item kitchen-note fields, payment methods, refunds, tables, KDS, reports, staff roles, and attendance shifts.
- **Still missing for the requested full workflow:** guided service details and assigned waiter, customer-facing review/confirmation, a saved-but-unsent order state and separate send-to-kitchen action, explicit Food/Drinks/Deals organization, store open/close status, an actionable pending-work-first Orders page, and the complete order/tender/history experience stitched together as one flow.
- **Important model distinction:** `Order.createdById` is the staff member who entered the order. Add a separate assigned waiter/server field instead of changing creator history. The existing `Order.status` values are `OPEN`, `BILLED`, `PAID`, and `CANCELLED`; kitchen and online acceptance have their own statuses. Do not overload one status field to represent store-open, kitchen-sent, or payment-provider state.

### Delivery principles

1. Preserve branch and role isolation in every API, query, mutation, and print request.
2. Keep a single order ID from POS through KDS, payment, receipt, and history.
3. Treat confirmation, kitchen send, payment, and store open/close as separate auditable events.
4. Use existing categories/modifiers/payments first; add only the smallest schema change needed for missing behavior.
5. Every write has a visible pending/success/failure state; failed writes keep the user's cart and do not claim success.
6. Keep owner/manager functions available without showing financial data to roles lacking sales permission.
7. Preserve the user's configured Docker/web entry port (currently requested as **2006**) while changing internal application behavior.

### Phase 0 — Freeze the baseline and define invariants

**Repository areas:** `apps/backend/prisma/schema.prisma`, `apps/backend/src/modules/orders/*`, `apps/web/components/pos/*`, `apps/web/app/(dashboard)/orders/page.tsx`, `apps/web/app/(dashboard)/kds/page.tsx`, `packages/types/src/permissions.ts`, `docker-compose.yml`.

- Record current order transitions, KOT creation/printing, payment idempotency, permission checks, table updates, and branch scoping before editing them.
- Agree on the user-visible states: **Draft (device only) → Confirmed / Not sent → Sent → Preparing → Ready → Served → Unpaid / Part paid / Paid**. Cancellation and refund remain separate outcomes.
- Define the invariants: one order number per saved order, one kitchen ticket per send action, edits after send create a kitchen update, payment retries cannot double-charge, and closing the store never deletes or blocks settlement of existing orders.
- Verify the working tree before each change set and keep implementation changes scoped; the repository currently contains a large pre-existing set of untracked files, so do not assume all untracked files belong to this plan.

**Exit condition:** a reviewed route/permission map and state-transition diagram, with current behaviors recorded so no existing capability disappears accidentally.

### Phase 1 — Finish role navigation and Today

**Files:** `apps/web/components/layout/nav-items.ts`, `sidebar-nav.tsx`, `mobile-bottom-nav.tsx`, `app-shell.tsx`, `apps/web/lib/route-access.ts`, `apps/web/app/(dashboard)/layout.tsx`, `apps/web/app/(dashboard)/dashboard/page.tsx`, `apps/web/hooks/use-dashboard.ts`, `apps/backend/src/modules/dashboard/*`, `packages/types/src/permissions.ts`, `apps/backend/src/permissions/permissions-sync.service.ts`.

- Retain the completed role-based entry and manager operations summary; resolve any remaining route fallback edge cases for custom roles.
- Ensure all links are grouped and permission filtered on both desktop and mobile. Add the missing permission gate for Attendance before exposing it.
- Today shows branch/store status, open orders, pending online orders, kitchen delay/readiness, tables, reservations, low-stock alerts when enabled, and quick actions. Financial cards and reports remain restricted to sales permissions.
- Make every Today card open the relevant filtered task view.

**Exit condition:** owner, manager, cashier, waiter, kitchen, accountant, delivery, and inventory roles land on a screen they can use; unauthorized dashboard APIs return no protected data.

### Phase 2 — Add branch open/close service status

**Progress (2026-11-02):** The first implementation slice adds branch open/closed state with an audit event model and migration, a permission-protected status endpoint/control on Today, backend blocking for new orders, a closed-state notice in staff POS, and closed-state feedback in public ordering/kiosk flows. Existing branches default open. Remaining before this phase is complete: apply the migration to a development database, walk through owner/manager/cashier/public scenarios, and review whether reopening needs a readiness checklist.

**Files:** `apps/backend/prisma/schema.prisma` plus a new migration; `apps/backend/src/modules/branches/*` or a focused store-status module; `apps/backend/src/modules/orders/orders.service.ts`; online acceptance controller/service; `packages/types/src/permissions.ts`; `apps/web/app/(dashboard)/dashboard/page.tsx`; new status hook/components.

- Add branch-level current service status and an append-only status-event history with actor, timestamp, and optional reason. Migrate existing branches to a documented safe initial value.
- Add `store.status.manage`; grant it by default to owner, administrator, and restaurant manager. Users who can view Today can see the badge, but only authorized roles can change the state.
- Create branch-scoped read, open, and close endpoints. Opening/closing must be auditable and safe to retry.
- Backend must refuse **new** staff and online orders while closed. Keep accept/decline handling explicit for online orders already awaiting a decision. Existing KDS work, order edits allowed by policy, payments, refunds, and history remain available.
- Add Today status badge and confirmation panels. Closing reviews un-sent, active kitchen, unpaid, and upcoming-reservation work and provides links; authorized manager may close with unresolved items clearly carried forward.

**Exit condition:** direct API calls cannot bypass closed status; one branch can be closed while another remains open; existing unpaid orders can still be paid after close.

### Phase 3 — Extend the order record safely

**Files:** `apps/backend/prisma/schema.prisma` plus a migration; `packages/types/src/orders.ts` and related DTO schemas; `apps/backend/src/modules/orders/orders.controller.ts`, `orders.service.ts`, order query DTOs; `apps/web/hooks/use-orders.ts`.

- Add nullable `assignedServerId` (or equivalent relation) to `Order`, with a safe foreign key to an active branch staff user. Keep `createdById` unchanged as the audit creator.
- Reuse existing `customerId`, `guestName`, `notes`, `OrderItem.kitchenNote`, and price snapshots. Add fields only if a real gap is confirmed, not duplicate aliases for existing data.
- Add an explicit kitchen-send timestamp/state or auditable event that distinguishes confirmed-but-unsent from sent. Do not expand `OrderStatus` to kitchen or branch states without a migration and transition design.
- Define and validate assignment DTOs, branch access, permissions, event audit, and backward-compatible response types.

**Exit condition:** old orders load with no assigned server; new orders retain creator and assigned waiter separately; cross-branch staff cannot be assigned.

### Phase 4 — Build the guided POS path

**Files:** `apps/web/app/(dashboard)/pos/page.tsx`; `apps/web/components/pos/cart-panel.tsx`, `product-grid.tsx`, `modifier-picker-dialog.tsx`, `cart-line.ts`, and new order-step/review components; `apps/web/hooks/use-orders.ts`; menu DTO/model only if required.

Implement in this order:

1. **Service details:** Dine-in/Takeaway/Delivery; table floor picker; existing table open-bill handling; customer name or customer lookup; assigned waiter defaulted to the current user; guest count and optional order note.
2. **Menu:** Food/Drinks/Deals section tabs mapped to configured categories. Use Deals as a category of priced menu items for v1. Search, availability, clear price, and item modifiers remain visible.
3. **Item choices:** configure spice as an item modifier group (single-choice where appropriate); include bland/no-spice only for supported dishes. Keep quantity, item note, remove/edit controls in the cart.
4. **Review:** present table, customer, waiter, item choices/notes, totals, and discount where permitted. Back navigation preserves cart and details. Button says **Confirm order**.
5. **Save:** confirmation creates one open, unpaid order without a KOT. Show a stable order number only after backend save. Retrying the same confirmation must not duplicate the order.
6. **Send:** show **Send to kitchen** and **Print kitchen ticket** for a confirmed order. A send endpoint creates KOT once and broadcasts the update. Print retry prints that ticket without creating another ticket/order.

Keep an optional **Confirm & send** shortcut for counter service after the explicit review, but never silently skip review or create the order twice.

**Exit condition:** owner/manager can take a dine-in order with table, waiter, customer name, spice choice, and notes, confirm it, send it once, and recover from save/print errors without losing data.

### Phase 5 — Connect kitchen, tables, and service handoff

**Files:** `apps/web/app/(dashboard)/kds/page.tsx`, `apps/web/hooks/use-kds.ts`, KOT services/controllers/print modules under `apps/backend/src/modules/orders/*`, `apps/web/app/(dashboard)/tables/page.tsx`, order detail components.

- KDS shows order number, elapsed time, table, waiter, quantities, modifiers, and prominent item/allergy notes. It never displays prices.
- KDS actions progress New → Preparing → Ready. Table/order detail shows readiness without manual refresh hunting.
- Front of house can mark Served; takeaway/delivery use their appropriate handoff labels.
- Edits after kitchen send create a visible delta/update ticket; cancellation requires permission and a reason when preparation has begun.
- Table state follows active orders and payment policy; staff can open an occupied table's existing order rather than accidentally creating a duplicate.

**Exit condition:** the saved order is consistently visible in KDS, table view, and order detail with the same ID and notes.

### Phase 6 — Reorganize Orders and history

**Files:** `apps/web/app/(dashboard)/orders/page.tsx`, `apps/web/components/orders/*`, `apps/backend/src/modules/orders/orders.controller.ts` and list/query services, `apps/web/hooks/use-orders.ts`.

- Default to **Needs attention**, sorted oldest first, for orders awaiting a kitchen send, online-order decision, kitchen action, service, or payment.
- Provide clear **Active**, **Completed**, and **Cancelled/Refunded** views. Completed means paid/closed under the agreed order rules; an unpaid bill is still active even if served.
- Add fast search/filter for order number, status, date, table, customer, waiter, and payment status.
- Order detail timeline shows creation/creator, assigned waiter, confirmation, KOT send/updates, ready/served, payment(s), receipt prints where tracked, and cancellation/refund events.
- Keep deletion/refund/cancel/edit actions behind existing or refined permissions and audit reasons.

**Exit condition:** staff can find an active order quickly, and owner can retrieve its complete history later.

### Phase 7 — Complete bill and tender flow

**Files:** `apps/web/components/pos/checkout-panel.tsx`, `payment-method-buttons.tsx`, receipt components; `apps/backend/src/modules/orders/*` payment/receipt/KOT print services; payment DTOs and `Payment` model only if needed.

- Bill layout contains restaurant/branch name, unique order/bill number, date/time, table, customer, waiter, line items, selected modifiers, totals, paid amount, and balance.
- Maintain separate kitchen ticket and customer bill print layouts. Kitchen tickets omit prices/payment; customer receipts include the bill and tender breakdown.
- Offer configured Cash, Card, Wallet, UPI, and Other choices. Keep UPI/card provider confirmation distinct from staff-recorded tender when no integration is configured.
- Allow unpaid and partial-payment orders to remain open. For cash, record received amount and change. Mark paid only when confirmed/recorded payments cover the balance.
- Use idempotency/transaction boundaries so payment retry/reprint cannot duplicate charges or receipts. Refunds remain linked to original payments.

**Exit condition:** cash, electronic/manual tender, split payment where enabled, pending confirmation, reprint, and refund records reconcile to the order bill.

### Phase 8 — Make management pages straightforward

**Files:** existing route pages under `apps/web/app/(dashboard)/menu`, `inventory`, `customers`, `team`, `reports`, `accounting`, `operations`, `settings`; their components/hooks; `apps/web/components/layout/*`.

- Menu default is items/categories; use simple category setup and modifiers for spice/deals; advanced recipe, tax, and web visibility options are secondary.
- Tables default to floor; reservations are a related tab. Inventory defaults to stock/low-stock, with purchases/waste secondary. Team defaults to staff, with schedule/attendance/payroll secondary.
- Reports open to today and payment totals; advanced exports and financial data use permissions.
- Keep deep links and permission checks while moving links into Manage groups. Do not merge unrelated routes solely to reduce navigation count.
- Add context-sensitive empty states so a new owner can create the first category/item/table without searching Settings.

**Exit condition:** a new owner can configure a basic branch, menu, tables, payments, and staff, then start service without enabling optional modules.

### Phase 9 — Migrations, rollout, and operational handoff

- Use forward-only Prisma migrations with nullable/backfilled safe defaults for existing data. Confirm the existing database provider and migration conventions before writing SQL.
- Run shared types generation/build, type checks, lint, and focused unit/integration/e2e checks for permission boundaries, state changes, and duplicate protection. Do not deploy or rewrite production data as part of local implementation.
- Perform role walk-throughs with disposable data: owner open/start/close; manager close with unresolved orders; cashier takeaway/payment; waiter dine-in with assignment; kitchen send/ready; accountant reports; inventory manager stock.
- Verify fresh install and upgrade paths, selected web port **2006**, database migration behavior, and Docker health checks. Keep backups and a rollback path for release changes.
- Release in reversible slices: permissions/dashboard → store status → data/API contract → guided POS → KDS/Orders → bill/payment → management navigation. Keep old POS behavior available until the new path is proven.
- Monitor failed order saves, duplicate KOT/payment attempts, closed-branch order rejections, print failures, and permission denials. Update the user guide with screenshots and actual role walkthroughs after final UI behavior is implemented.

### End-to-end definition of done

The system is ready for a small restaurant when an owner can open their branch, choose a table, assign themselves or a waiter, record customer name/notes, select food/drink/deal items and spice choices, review and confirm, send and print a kitchen ticket, follow preparation, bill the customer with the correct restaurant/table details, accept cash or configured electronic tenders, leave or settle a balance safely, and find the complete order later. A manager can perform the same service loop and close the branch with unresolved work clearly shown. Staff permissions, branch boundaries, order history, and financial visibility remain enforced by the backend throughout.

