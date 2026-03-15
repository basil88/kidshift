"use client";

import { useEffect, useState } from "react";

interface NowIndicatorProps {
  startHour: number;
  endHour: number;
}

export function NowIndicator({ startHour, endHour }: NowIndicatorProps) {
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    function compute() {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;

      if (hours < startHour || hours > endHour) {
        setPosition(null);
        return;
      }

      const pct = ((hours - startHour) / (endHour - startHour)) * 100;
      setPosition(pct);
    }

    compute();
    const interval = setInterval(compute, 60 * 1000);
    return () => clearInterval(interval);
  }, [startHour, endHour]);

  if (position === null) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-20"
      style={{ top: `${position}%` }}
    >
      <div className="flex items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <div className="h-[2px] flex-1 bg-red-500" />
      </div>
    </div>
  );
}
