# Public restaurant website

The public restaurant site and online ordering app runs on host port `2020`.
The existing staff POS remains on host port `2006`; both connect to the same
backend and database.

## Start with Docker Compose

```powershell
docker compose build backend web storefront
docker compose up -d
```

Open `http://localhost:2020` for the public site and `http://localhost:2006`
for the POS.

## Connect a branch

In the POS, open **Settings → Public website** and enable the public website
for the branch. The generated share link opens the new storefront on port
`2020`; share that URL (it includes the branch token) with customers. The
legacy POS order page remains available for older links.

To make the root address `http://localhost:2020` open a specific branch,
copy its token into `STOREFRONT_DEFAULT_TOKEN` in `.env` and restart only the
storefront:

```powershell
docker compose up -d storefront
```

If `NEXT_PUBLIC_PUBLIC_ORDER_TOKEN` is set, Compose also uses it as the
storefront default. For a domain or HTTPS deployment, set
`NEXT_PUBLIC_PUBLIC_STOREFRONT_ORIGIN` to the customer-facing site origin
before rebuilding the POS web image. The storefront itself can be placed
behind a reverse proxy or tunnel that forwards to port `2020`.

## Orders and stories

Customer orders use the existing branch menu and order validation. The POS
recalculates item prices and delivery fees; new online orders appear in the
kitchen display pending staff acceptance. Customers pay at pickup or delivery.

Staff with the `marketing.manage` permission can sign in at
`http://localhost:2020/manage` to save drafts, publish journal stories, and
edit or remove them. Public journal pages show published stories only.
