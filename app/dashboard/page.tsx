"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { StatusBar } from "@/components/layout/StatusBar";
import { DayTimeline } from "@/components/timeline/DayTimeline";
import { ConflictBanner } from "@/components/timeline/ConflictBanner";
import { PartnerStatus } from "@/components/pair/PartnerStatus";
import { useFreeBusy } from "@/hooks/useFreeBusy";
import { usePairStatus } from "@/hooks/usePairStatus";
import { useCurrentSlot } from "@/hooks/useCurrentSlot";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/AuthGuard";
import { TelegramConnect } from "@/components/telegram/TelegramConnect";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  if (dateStr === todayStr) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function DashboardContent() {
  const router = useRouter();
  const [date, setDate] = useState(getToday);

  const { data: pairData, isLoading: pairLoading, refresh: pairRefresh } = usePairStatus();
  const { data: freeBusy, isLoading: fbLoading, error: fbError, refresh } = useFreeBusy(date);

  const currentSlot = useCurrentSlot(
    freeBusy?.you || [],
    freeBusy?.partner || []
  );

  // Redirect to pair page if not paired
  if (!pairLoading && pairData && !pairData.paired) {
    router.push("/pair");
    return null;
  }

  const partnerName = pairData?.pair?.partner?.name || null;

  // Stale data warning
  const isStale =
    freeBusy?.fetchedAt &&
    Date.now() - new Date(freeBusy.fetchedAt).getTime() > 15 * 60 * 1000;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {/* Partner status + refresh */}
        <div className="flex items-center justify-between">
          {pairData?.pair ? (
            <PartnerStatus
              partner={pairData.pair.partner}
              status={pairData.pair.status}
              onUnlink={async () => {
                const res = await fetch("/api/pair/leave", { method: "POST" });
                if (!res.ok) throw new Error("Failed to unlink");
                pairRefresh();
              }}
            />
          ) : (
            <Skeleton className="h-6 w-48" />
          )}
          <Button variant="ghost" size="sm" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>

        {/* Status bar — current moment */}
        {freeBusy && date === getToday() && (
          <StatusBar state={currentSlot} partnerName={partnerName} />
        )}

        {/* Stale data warning */}
        {isStale && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Data is over 15 minutes old.{" "}
            <button
              onClick={() => refresh()}
              className="font-medium underline"
            >
              Refresh now
            </button>
          </div>
        )}

        {/* Conflict banner */}
        {freeBusy && <ConflictBanner conflicts={freeBusy.conflicts} />}

        {/* Day navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            ← Prev
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">{formatDate(date)}</h2>
            {date !== getToday() && (
              <button
                onClick={() => setDate(getToday())}
                className="text-xs text-muted-foreground underline"
              >
                Back to today
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            Next →
          </Button>
        </div>

        {/* Timeline */}
        {fbLoading ? (
          <Skeleton className="h-[500px] w-full rounded-lg" />
        ) : fbError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center">
            <p className="text-sm text-red-800">
              Failed to load calendar data.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => refresh()}
            >
              Retry
            </Button>
          </div>
        ) : freeBusy ? (
          <DayTimeline
            yourBusy={freeBusy.you}
            partnerBusy={freeBusy.partner}
            date={date}
            partnerName={partnerName}
          />
        ) : null}

        {/* Telegram connect */}
        <TelegramConnect />

        {/* Last updated */}
        {freeBusy?.fetchedAt && (
          <p className="text-center text-xs text-muted-foreground">
            Last updated:{" "}
            {new Date(freeBusy.fetchedAt).toLocaleTimeString()}
          </p>
        )}
      </main>
    </>
  );
}
