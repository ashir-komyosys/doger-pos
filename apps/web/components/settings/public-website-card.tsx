"use client";

import { Copy, ExternalLink, KeyRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  useSetPublicWebsite,
  useUpdateBranchSettings,
  type BranchSettings,
} from "@/hooks/use-settings";

// Settings > Public website. A public ordering page that customers can
// reach from outside the restaurant (takeaway / delivery). Orders arrive
// as online orders waiting for staff to accept on the kitchen display.
export function PublicWebsiteCard({
  branchId,
  branch,
}: {
  branchId: string | null;
  branch: BranchSettings;
}) {
  const setPublicWebsite = useSetPublicWebsite(branchId);
  const update = useUpdateBranchSettings(branchId);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const url =
    branch.publicToken && typeof window !== "undefined"
      ? `${(process.env.NEXT_PUBLIC_PUBLIC_STOREFRONT_ORIGIN || `${window.location.protocol}//${window.location.hostname}:2020`).replace(/\/$/, "")}/public/${branch.publicToken}`
      : null;

  const run = (action: "enable" | "rotate" | "disable", done: string) =>
    setPublicWebsite.mutate(action, {
      onSuccess: () => {
        toast.success(done);
        setConfirmRotate(false);
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Could not update the public website"),
    });

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-[18px] font-medium text-foreground">Public website</h2>
        <p className="text-sm text-muted-foreground">
          A public menu and ordering page your customers can reach from a
          link or QR code. They browse the items you&rsquo;ve marked as
          visible on the website and place a takeaway or delivery order.
          Payment is taken at the counter (takeaway) or on delivery.
        </p>
      </div>

      {!branch.publicToken ? (
        <div>
          <Button onClick={() => run("enable", "Public website enabled")} disabled={setPublicWebsite.isPending}>
            Enable public website
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor="public-website-url">Public website address (share this with customers)</Label>
              <div className="flex gap-2">
                <input
                  id="public-website-url"
                  readOnly
                  value={url ?? ""}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copy public website address"
                  onClick={() =>
                    url &&
                    navigator.clipboard
                      .writeText(url)
                      .then(() => toast.success("Copied"))
                      .catch(() => toast.error("Copy failed — select the address and copy it"))
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open public website in a new tab"
                  onClick={() => url && window.open(url, "_blank", "noopener")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this address can place orders. Only the items
                you have marked &ldquo;Show on website&rdquo; in Menu are
                visible. Use the HTTPS address (not a plain-HTTP LAN one)
                so customers can open it from their phones.
              </p>
            </div>
            {url && (
              <div className="shrink-0 rounded-lg bg-white p-2" aria-label="QR code of the public website address">
                <QRCodeSVG value={url} size={112} marginSize={1} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {confirmRotate ? (
              <>
                <span className="text-sm text-foreground">
                  The current public website address will stop working immediately. Continue?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={setPublicWebsite.isPending}
                  onClick={() => run("rotate", "New public website address created")}
                >
                  Yes, replace it
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRotate(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setConfirmRotate(true)}>
                  <KeyRound className="h-4 w-4" /> Create new address
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={setPublicWebsite.isPending}
                  onClick={() => run("disable", "Public website turned off")}
                >
                  Turn public website off
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
