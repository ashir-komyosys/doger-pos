"use client";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import { NavDot } from "@/components/layout/nav-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateCheck } from "@/hooks/use-updates";

export default function UpdatesPage() {
  const { data, isLoading, refetch, isFetching } = useUpdateCheck();

  return (
    <div className="flex flex-col gap-6">
      <SettingsTabs />

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium">Application Updates</h2>
            <p className="text-sm text-muted-foreground">
              Check the version running on this restaurant server.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Refreshing…" : "Refresh version"}
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : data ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Running:</span>
              <Badge variant="outline">{data.currentVersion}</Badge>
              {data.latestVersion && (
                <>
                  <span className="text-muted-foreground">Latest:</span>
                  <Badge
                    variant={
                      data.updateAvailable || data.building
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {data.latestVersion}
                  </Badge>
                </>
              )}
              {data.updateAvailable ? (
                <Badge className="gap-2">
                  <NavDot className="ml-0 h-2 w-2" label="Update available" />
                  Update available
                </Badge>
              ) : data.building ? (
                <Badge variant="outline">New release building</Badge>
              ) : !data.latestVersion ? (
                <Badge variant="outline">Manual updates</Badge>
              ) : (
                <Badge variant="outline">Up to date</Badge>
              )}
            </div>

            {!data.latestVersion && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                This install has no automatic update feed. Update it using the
                same method you used to install it, then restart the app.
              </p>
            )}

            {data.currentVersion === "dev" && (
              <p className="text-sm text-muted-foreground">
                Running a dev build — version comparison isn&apos;t meaningful
                here.
              </p>
            )}

            {data.building && (
              <p className="text-sm text-muted-foreground">
                {data.latestVersion} is published but its images are still being
                built. Check again in a few minutes.
              </p>
            )}

            {data.releaseUrl && (
              <a
                href={data.releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted-foreground underline underline-offset-3 hover:text-foreground"
              >
                View release notes
              </a>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
