"use client";

import { useEffect, useRef } from "react";
import { BusySlot, SlotState } from "@/lib/types";
import { TimeSlot } from "./TimeSlot";
import { NowIndicator } from "./NowIndicator";

interface DayTimelineProps {
  yourBusy: BusySlot[];
  partnerBusy: BusySlot[];
  date: string; // YYYY-MM-DD
  partnerName?: string | null;
}

const START_HOUR = 7;
const END_HOUR = 21; // 9 PM
const SLOT_MINUTES = 30;
const HALF = 15; // 15-min precision within each 30-min slot

function getHalfState(
  halfStart: Date,
  halfEnd: Date,
  yourBusy: BusySlot[],
  partnerBusy: BusySlot[]
): SlotState {
  const youBusy = yourBusy.some((s) => {
    const bStart = new Date(s.start).getTime();
    const bEnd = new Date(s.end).getTime();
    return bStart < halfEnd.getTime() && bEnd > halfStart.getTime();
  });

  const theyBusy = partnerBusy.some((s) => {
    const bStart = new Date(s.start).getTime();
    const bEnd = new Date(s.end).getTime();
    return bStart < halfEnd.getTime() && bEnd > halfStart.getTime();
  });

  if (youBusy && theyBusy) return "conflict";
  if (youBusy) return "you-busy";
  if (theyBusy) return "partner-busy";
  return "both-free";
}

// Find the busy block that overlaps a given time point
function findOverlappingBlock(time: Date, blocks: BusySlot[]): BusySlot | null {
  const t = time.getTime();
  return blocks.find((s) => {
    const start = new Date(s.start).getTime();
    const end = new Date(s.end).getTime();
    return start <= t && end > t;
  }) || null;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(slot: BusySlot): string {
  const start = formatTime(new Date(slot.start));
  const end = formatTime(new Date(slot.end));
  return `${start}–${end}`;
}

// Build the label for a half-slot including the busy block's time range
function getHalfLabel(
  halfStart: Date,
  state: SlotState,
  yourBusy: BusySlot[],
  partnerBusy: BusySlot[],
  partnerName?: string | null
): string {
  if (state === "both-free") return "";
  if (state === "conflict") return "CONFLICT";

  if (state === "you-busy") {
    const block = findOverlappingBlock(halfStart, yourBusy);
    const range = block ? ` ${formatTimeRange(block)}` : "";
    return `You're busy${range}`;
  }

  // partner-busy
  const name = partnerName || "Partner";
  const block = findOverlappingBlock(halfStart, partnerBusy);
  const range = block ? ` ${formatTimeRange(block)}` : "";
  return `${name} busy${range}`;
}

function formatSlotTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isCurrentSlot(slotStart: Date, slotEnd: Date): boolean {
  const now = new Date();
  return now >= slotStart && now < slotEnd;
}

export function DayTimeline({ yourBusy, partnerBusy, date, partnerName }: DayTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nowSlotRef = useRef<HTMLDivElement>(null);

  // Generate 30-min slots from START_HOUR to END_HOUR, each with two 15-min halves
  const slots: {
    time: string;
    firstHalf: SlotState;
    secondHalf: SlotState;
    firstHalfLabel: string;
    secondHalfLabel: string;
    isCurrent: boolean;
    start: Date;
    end: Date;
  }[] = [];

  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const slotStart = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const slotMid = new Date(slotStart.getTime() + HALF * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60 * 1000);

      const firstHalf = getHalfState(slotStart, slotMid, yourBusy, partnerBusy);
      const secondHalf = getHalfState(slotMid, slotEnd, yourBusy, partnerBusy);

      slots.push({
        time: formatSlotTime(slotStart),
        firstHalf,
        secondHalf,
        firstHalfLabel: getHalfLabel(slotStart, firstHalf, yourBusy, partnerBusy, partnerName),
        secondHalfLabel: getHalfLabel(slotMid, secondHalf, yourBusy, partnerBusy, partnerName),
        isCurrent: isCurrentSlot(slotStart, slotEnd),
        start: slotStart,
        end: slotEnd,
      });
    }
  }

  // Auto-scroll to current time slot
  useEffect(() => {
    if (nowSlotRef.current) {
      nowSlotRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [date]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto rounded-lg border bg-white"
      style={{ maxHeight: "calc(100vh - 280px)" }}
    >
      <NowIndicator startHour={START_HOUR} endHour={END_HOUR} />
      {slots.map((slot, i) => (
        <div key={i} ref={slot.isCurrent ? nowSlotRef : undefined}>
          <TimeSlot
            time={slot.time}
            firstHalf={slot.firstHalf}
            secondHalf={slot.secondHalf}
            firstHalfLabel={slot.firstHalfLabel}
            secondHalfLabel={slot.secondHalfLabel}
            isCurrentSlot={slot.isCurrent}
          />
        </div>
      ))}
    </div>
  );
}
