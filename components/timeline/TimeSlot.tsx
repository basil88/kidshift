"use client";

import { SlotState } from "@/lib/types";

interface TimeSlotProps {
  time: string; // e.g. "7:00 AM"
  firstHalf: SlotState;
  secondHalf: SlotState;
  isCurrentSlot: boolean;
}

const halfStyles: Record<SlotState, string> = {
  "both-free": "bg-emerald-50/50",
  "you-busy": "bg-blue-100",
  "partner-busy": "bg-amber-100",
  conflict: "bg-red-100 border-x border-red-300",
};

const slotLabels: Record<SlotState, string> = {
  "both-free": "",
  "you-busy": "You're busy",
  "partner-busy": "Partner busy",
  conflict: "CONFLICT",
};

// Pick the most important state to show a label for the row
function primaryState(first: SlotState, second: SlotState): SlotState {
  const priority: SlotState[] = ["conflict", "you-busy", "partner-busy", "both-free"];
  for (const s of priority) {
    if (first === s || second === s) return s;
  }
  return "both-free";
}

export function TimeSlot({ time, firstHalf, secondHalf, isCurrentSlot }: TimeSlotProps) {
  const label = slotLabels[primaryState(firstHalf, secondHalf)];
  const uniform = firstHalf === secondHalf;

  return (
    <div
      className={`flex h-12 items-stretch border-b border-gray-100 ${
        isCurrentSlot ? "ring-1 ring-inset ring-gray-300" : ""
      }`}
    >
      {/* Time label */}
      <div className="w-20 shrink-0 px-2 flex items-center justify-end text-xs text-gray-500">
        {time}
      </div>

      {/* Content area with two halves */}
      <div className="flex flex-1 flex-col relative">
        {uniform ? (
          // Both halves same state — single block
          <div className={`flex-1 flex items-center px-3 ${halfStyles[firstHalf]}`}>
            {label && (
              <span
                className={`text-xs font-medium ${
                  firstHalf === "conflict"
                    ? "text-red-700"
                    : firstHalf === "you-busy"
                    ? "text-blue-700"
                    : firstHalf === "partner-busy"
                    ? "text-amber-700"
                    : ""
                }`}
              >
                {label}
              </span>
            )}
          </div>
        ) : (
          // Different states for each half
          <>
            <div className={`h-6 flex items-center px-3 ${halfStyles[firstHalf]} ${
              firstHalf === "conflict" ? "border-t border-red-300" : ""
            }`}>
              {firstHalf !== "both-free" && (
                <span
                  className={`text-[10px] font-medium ${
                    firstHalf === "conflict"
                      ? "text-red-700"
                      : firstHalf === "you-busy"
                      ? "text-blue-700"
                      : "text-amber-700"
                  }`}
                >
                  {slotLabels[firstHalf]}
                </span>
              )}
            </div>
            <div className={`h-6 flex items-center px-3 ${halfStyles[secondHalf]} ${
              secondHalf === "conflict" ? "border-b border-red-300" : ""
            }`}>
              {secondHalf !== "both-free" && (
                <span
                  className={`text-[10px] font-medium ${
                    secondHalf === "conflict"
                      ? "text-red-700"
                      : secondHalf === "you-busy"
                      ? "text-blue-700"
                      : "text-amber-700"
                  }`}
                >
                  {slotLabels[secondHalf]}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
