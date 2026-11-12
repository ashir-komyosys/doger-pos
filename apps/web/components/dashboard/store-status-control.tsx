"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, Clock3, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, hasPermission } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { useSetStoreStatus, useStoreStatus } from "@/hooks/use-store-status";

export function StoreStatusControl() {
  const { branchId } = useBranch();
  const { data: currentUser } = useCurrentUser();
  const { data: status, isLoading, isError } = useStoreStatus(branchId);
  const update = useSetStoreStatus(branchId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const canManage = hasPermission(currentUser?.user, "store.status.manage");

  const confirmChange = () => {
    if (!status) return;
    update.mutate(
      { isOpen: !status.isStoreOpen, reason: reason.trim() || undefined },
      {
        onSuccess: (next) => {
          toast.success(next.isStoreOpen ? `${next.name} is open for service` : `${next.name} is closed to new orders`);
          setDialogOpen(false);
          setReason("");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update store status"),
      },
    );
  };

  if (isLoading) return <Skeleton className="h-20 w-full rounded-2xl" />;
  if (isError || !status) return null;

  const isClosing = status.isStoreOpen;
  const outstandingCount = status.outstanding.openOrders + status.outstanding.kitchenTickets;

  return (
    <>
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${status.isStoreOpen ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">{status.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.isStoreOpen ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {status.isStoreOpen ? "Open" : "Closed"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {status.lastChange
                ? `${status.lastChange.isOpen ? "Opened" : "Closed"} by ${status.lastChange.changedBy.name} · ${new Date(status.lastChange.changedAt).toLocaleString()}`
                : "No service status changes recorded yet"}
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant={isClosing ? "outline" : "default"} onClick={() => setDialogOpen(true)}>
            {isClosing ? "Close store" : "Open store"}
          </Button>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !update.isPending && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isClosing ? "Close for service?" : "Open for service?"}</DialogTitle>
            <DialogDescription>
              {isClosing
                ? `New orders at ${status.name} will be blocked. Existing orders can still be prepared and paid.`
                : `Staff can create new orders at ${status.name} after you open it.`}
            </DialogDescription>
          </DialogHeader>

          {isClosing && outstandingCount > 0 && (
            <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="text-foreground">
                <p className="font-medium">There is still work in progress</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>{status.outstanding.openOrders} open or unpaid order(s)</li>
                  <li>{status.outstanding.kitchenTickets} unfinished kitchen ticket(s)</li>
                  {status.outstanding.pendingOnlineOrders > 0 && <li>{status.outstanding.pendingOnlineOrders} online order(s) waiting for a decision</li>}
                </ul>
                <p className="mt-2 text-xs">Closing will not cancel or delete them. Staff can finish these orders after closing.</p>
              </div>
            </div>
          )}

          {status.lastChange && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {status.isStoreOpen ? <Clock3 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Last change: {new Date(status.lastChange.changedAt).toLocaleString()}
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            Reason (optional)
            <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder={isClosing ? "End of service" : "Opening for the day"} />
          </label>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={update.isPending}>Cancel</Button>
            <Button variant={isClosing ? "destructive" : "default"} onClick={confirmChange} disabled={update.isPending}>
              {update.isPending ? "Saving…" : isClosing ? "Close for service" : "Open for service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
