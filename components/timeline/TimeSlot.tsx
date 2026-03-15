"use client";

import { SlotState } from "@/lib/types";

interface TimeSlotProps {
  time: string; // e.g. "7:00 AM"
  state: SlotState;
  isCurrentSlot: boolean;
}

const slotStyles: Record<SlotState, string> = {
  "both-free": "bg-emerald-50/50",
  "you-busy": "bg-blue-100",
  "partner-busy": "bg-amber-100",
  conflict: "bg-red-100 border-red-300 border",
};

const slotLabels: Record<SlotState, string> = {
  "both-free": "",
  "you-busy": "You're busy",
  "partner-busy": "Partner busy",
  conflict: "CONFLICT",
};

export function TimeSlot({ time, state, isCurrentSlot }: TimeSlotProps) {
  return (
    <div
      className={`flex h-12 items-center border-b border-gray-100 ${slotStyles[state]} ${
        isCurrentSlot ? "ring-1 ring-inset ring-gray-300" : ""
      }`}
    >
      <div className="w-20 shrink-0 px-2 text-right text-xs text-gray-500">
        {time}
      </div>
      <div className="flex flex-1 items-center px-3">
        {state !== "both-free" && (
          <span
            className={`text-xs font-medium ${
              state === "conflict"
                ? "text-red-700"
                : state === "you-busy"
                ? "text-blue-700"
                : "text-amber-700"
            }`}
          >
            {slotLabels[state]}
          </span>
        )}
      </div>
    </div>
  );
}
