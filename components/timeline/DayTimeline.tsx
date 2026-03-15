"use client";

import { useEffect, useRef } from "react";
import { BusySlot, SlotState } from "@/lib/types";
import { TimeSlot } from "./TimeSlot";
import { NowIndicator } from "./NowIndicator";

interface DayTimelineProps {
  yourBusy: BusySlot[];
  partnerBusy: BusySlot[];
  date: string; // YYYY-MM-DD
}

const START_HOUR = 7;
const END_HOUR = 21; // 9 PM
const SLOT_MINUTES = 30;

function getSlotState(
  slotStart: Date,
  slotEnd: Date,
  yourBusy: BusySlot[],
  partnerBusy: BusySlot[]
): SlotState {
  const youBusy = yourBusy.some((s) => {
    const bStart = new Date(s.start).getTime();
    const bEnd = new Date(s.end).getTime();
    return bStart < slotEnd.getTime() && bEnd > slotStart.getTime();
  });

  const theyBusy = partnerBusy.some((s) => {
    const bStart = new Date(s.start).getTime();
    const bEnd = new Date(s.end).getTime();
    return bStart < slotEnd.getTime() && bEnd > slotStart.getTime();
  });

  if (youBusy && theyBusy) return "conflict";
  if (youBusy) return "you-busy";
  if (theyBusy) return "partner-busy";
  return "both-free";
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

export function DayTimeline({ yourBusy, partnerBusy, date }: DayTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nowSlotRef = useRef<HTMLDivElement>(null);

  // Generate 30-min slots from START_HOUR to END_HOUR
  const slots: {
    time: string;
    state: SlotState;
    isCurrent: boolean;
    start: Date;
    end: Date;
  }[] = [];

  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const slotStart = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60 * 1000);

      slots.push({
        time: formatSlotTime(slotStart),
        state: getSlotState(slotStart, slotEnd, yourBusy, partnerBusy),
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
            state={slot.state}
            isCurrentSlot={slot.isCurrent}
          />
        </div>
      ))}
    </div>
  );
}
