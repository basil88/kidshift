"use client";

import { useEffect, useState } from "react";
import { BusySlot, SlotState } from "@/lib/types";

function isWithinSlot(time: Date, slots: BusySlot[]): boolean {
  const t = time.getTime();
  return slots.some(
    (s) => t >= new Date(s.start).getTime() && t < new Date(s.end).getTime()
  );
}

export function useCurrentSlot(
  yourBusy: BusySlot[],
  partnerBusy: BusySlot[]
): SlotState {
  const [state, setState] = useState<SlotState>("both-free");

  useEffect(() => {
    function compute() {
      const now = new Date();
      const youBusy = isWithinSlot(now, yourBusy);
      const theyBusy = isWithinSlot(now, partnerBusy);

      if (youBusy && theyBusy) setState("conflict");
      else if (youBusy) setState("you-busy");
      else if (theyBusy) setState("partner-busy");
      else setState("both-free");
    }

    compute();
    const interval = setInterval(compute, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [yourBusy, partnerBusy]);

  return state;
}
