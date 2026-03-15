"use client";

import { BusySlot } from "@/lib/types";

interface ConflictBannerProps {
  conflicts: BusySlot[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConflictBanner({ conflicts }: ConflictBannerProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
      <p className="text-sm font-semibold text-red-800">
        {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} today
      </p>
      <ul className="mt-1 space-y-0.5">
        {conflicts.map((c, i) => (
          <li key={i} className="text-sm text-red-700">
            {formatTime(c.start)} – {formatTime(c.end)}
          </li>
        ))}
      </ul>
    </div>
  );
}
