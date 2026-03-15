"use client";

import { SlotState } from "@/lib/types";

interface StatusBarProps {
  state: SlotState;
  partnerName: string | null;
}

const statusConfig: Record<
  SlotState,
  { bg: string; text: string; getMessage: (name: string) => string }
> = {
  "both-free": {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    getMessage: (name) =>
      `You're both free. Either of you can schedule.`,
  },
  "you-busy": {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    getMessage: (name) =>
      `You have a meeting — ${name || "your partner"} is on kid duty.`,
  },
  "partner-busy": {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    getMessage: (name) =>
      `${name || "Your partner"} has a meeting — you're on kid duty.`,
  },
  conflict: {
    bg: "bg-red-50 border-red-300",
    text: "text-red-800",
    getMessage: (name) =>
      `CONFLICT: Both of you are busy right now. Who has the kids?`,
  },
};

export function StatusBar({ state, partnerName }: StatusBarProps) {
  const config = statusConfig[state];
  const name = partnerName || "Your partner";

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${config.bg}`}
    >
      <p className={`text-center text-sm font-medium ${config.text}`}>
        {config.getMessage(name)}
      </p>
    </div>
  );
}
