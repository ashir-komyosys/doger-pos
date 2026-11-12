// Per-kiosk web app manifest so the browser's "Add to Home screen" / install
// creates a shortcut that opens THIS kiosk URL full-screen in landscape. It
// is a PWA/browser shortcut only: there is no APK and no Play Store listing.

const TOKEN = /^[a-f0-9]{32}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return new Response("Not found", { status: 404 });
  const base = `/kiosk/${token}`;
  const manifest = {
    id: base,
    name: "Autopedido",
    short_name: "Autopedido",
    description: "Autopedido para clientes",
    start_url: base,
    scope: `${base}`,
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "landscape",
    background_color: "#fbf9f8",
    theme_color: "#FE8C00",
    lang: "es",
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache",
    },
  });
}
