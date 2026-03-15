import { BusySlot } from "@/lib/types";

// Compute overlapping intervals between two sorted busy arrays
export function computeConflicts(
  slotsA: BusySlot[],
  slotsB: BusySlot[]
): BusySlot[] {
  const conflicts: BusySlot[] = [];
  let i = 0;
  let j = 0;

  while (i < slotsA.length && j < slotsB.length) {
    const aStart = new Date(slotsA[i].start).getTime();
    const aEnd = new Date(slotsA[i].end).getTime();
    const bStart = new Date(slotsB[j].start).getTime();
    const bEnd = new Date(slotsB[j].end).getTime();

    // Check overlap
    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEnd, bEnd);

    if (overlapStart < overlapEnd) {
      conflicts.push({
        start: new Date(overlapStart).toISOString(),
        end: new Date(overlapEnd).toISOString(),
      });
    }

    // Advance the pointer with the earlier end time
    if (aEnd <= bEnd) {
      i++;
    } else {
      j++;
    }
  }

  return conflicts;
}
