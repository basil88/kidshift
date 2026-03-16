"use client";

import { SlotState } from "@/lib/types";

interface TimeSlotProps {
  time: string; // e.g. "7:00 AM"
  firstHalf: SlotState;
  secondHalf: SlotState;
  firstHalfLabel: string;
  secondHalfLabel: string;
  isCurrentSlot: boolean;
}

const halfStyles: Record<SlotState, string> = {
  "both-free": "bg-emerald-50/50",
  "you-busy": "bg-blue-100",
  "partner-busy": "bg-amber-100",
  conflict: "bg-red-100 border-x border-red-300",
};

const textColors: Record<SlotState, string> = {
  "both-free": "",
  "you-busy": "text-blue-700",
  "partner-busy": "text-amber-700",
  conflict: "text-red-700",
};

// Pick the most important state to show a label for the row
function primaryState(first: SlotState, second: SlotState): SlotState {
  const priority: SlotState[] = ["conflict", "you-busy", "partner-busy", "both-free"];
  for (const s of priority) {
    if (first === s || second === s) return s;
  }
  return "both-free";
}

export function TimeSlot({ time, firstHalf, secondHalf, firstHalfLabel, secondHalfLabel, isCurrentSlot }: TimeSlotProps) {
  const uniform = firstHalf === secondHalf;
  const primary = primaryState(firstHalf, secondHalf);
  // For uniform slots, pick the label from the first half (same block)
  const uniformLabel = firstHalfLabel || secondHalfLabel;

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
            {uniformLabel && (
              <span className={`text-xs font-medium ${textColors[primary]}`}>
                {uniformLabel}
              </span>
            )}
          </div>
        ) : (
          // Different states for each half
          <>
            <div className={`h-6 flex items-center px-3 ${halfStyles[firstHalf]} ${
              firstHalf === "conflict" ? "border-t border-red-300" : ""
            }`}>
              {firstHalfLabel && (
                <span className={`text-[10px] font-medium ${textColors[firstHalf]}`}>
                  {firstHalfLabel}
                </span>
              )}
            </div>
            <div className={`h-6 flex items-center px-3 ${halfStyles[secondHalf]} ${
              secondHalf === "conflict" ? "border-b border-red-300" : ""
            }`}>
              {secondHalfLabel && (
                <span className={`text-[10px] font-medium ${textColors[secondHalf]}`}>
                  {secondHalfLabel}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
