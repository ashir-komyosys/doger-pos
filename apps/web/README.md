# Dogar's Fire & Flavour — web application

The staff workspace and public ordering site are built with Next.js, React, and TypeScript.

## Development

From the repository root:

1. Copy .env.example to .env and set the local secrets.
2. Install dependencies with pnpm install.
3. Run pnpm dev.

The web app runs at **http://localhost:3030** by default. Change DEV_PORT in the root .env to use a different development port. The full dev command also starts the backend; follow the root README for its database setup.

To run only the web app:

pnpm --filter web dev

## Docker

From the repository root, run:

docker compose up --build

The app is published at **http://localhost:2006** by default. Set HOST_PORT in the root .env to change the host port. Docker maps this port to the Next.js container on port 3000.

Leave SUPABASE_DATABASE_URL blank to use the local PostgreSQL container. Set it in .env to use the restaurant's Supabase PostgreSQL database.

## Local design data

When NODE_ENV=development and no public menu token is configured, the landing page shows a clearly labeled sample PKR menu. Production does not show those mock dishes. Set NEXT_PUBLIC_PUBLIC_ORDER_TOKEN in .env to connect the home-page menu and Order Online buttons to the live public ordering menu.

See docs/DOGARS_REDESIGN_AND_OFFLINE_PLAN.md for the page map, Supabase plan, offline design, and staged APK/EXE delivery.

